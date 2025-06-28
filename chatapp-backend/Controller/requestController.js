const Request = require('../Model/requestSchema');

// Initialize Socket.IO and userSockets globally
let io;
let userSockets = {};

// Inject Socket.IO instance
exports.injectIO = (socketIO) => {
  io = socketIO;
};

// Set userSockets map
exports.setUserSockets = (map) => {
  userSockets = map;
};

// Send a friend request
exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user._id; // From JWT middleware
    const { receiverId } = req.body;

    // Validate receiverId
    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId is required' });
    }

    // Prevent self-requests
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    // Check for existing pending request
    const existingPending = await Request.findOne({
      senderId,
      receiverId,
      status: 'pending',
    });
    if (existingPending) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Check for existing accepted connection
    const existingAccepted = await Request.findOne({
      status: 'accepted',
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    if (existingAccepted) {
      return res.status(400).json({ message: 'Users are already connected' });
    }

    // Create and save new request
    const newRequest = new Request({ senderId, receiverId });
    await newRequest.save();
    console.log(`Request sent: ${newRequest._id}`);

    // Emit Socket.IO event to receiver
    const receiverSocket = userSockets[receiverId];
    if (receiverSocket && io) {
      io.to(receiverSocket).emit('new_request', {
        requestId: newRequest._id,
        senderId,
        receiverId,
        message: 'You have a new friend request!',
      });
      console.log(`New request emitted to receiver: ${receiverId}`);
    } else {
      console.log(`Receiver ${receiverId} not connected or io not initialized`);
    }

    res.status(201).json({ message: 'Request sent', request: newRequest });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ message: 'Failed to send request', error: error.message });
  }
};

// Get pending friend requests for the user
exports.getRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Request.find({ receiverId: userId, status: 'pending' }).populate(
      'senderId',
      'name email image'
    );
    console.log(`Requests fetched for user: ${userId}, count: ${requests.length}`);
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Failed to get requests', error: error.message });
  }
};

// Update the status of a friend request
exports.updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update request status
    const updated = await Request.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('senderId', 'name email image')
      .populate('receiverId', 'name email image');

    if (!updated) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Emit Socket.IO event if request is accepted
    if (status === 'accepted') {
      const senderId = updated.senderId._id.toString();
      const receiverId = updated.receiverId._id.toString(); // Fixed syntax error
      const senderSocket = userSockets[senderId];
      const receiverSocket = userSockets[receiverId];

      if (senderSocket && io) {
        io.to(senderSocket).emit('request_accepted', { requestId: id });
        console.log(`Request accepted emitted to sender: ${senderId}`);
      } else {
        console.log(`Sender ${senderId} not connected or io not initialized`);
      }

      if (receiverSocket && io) {
        io.to(receiverSocket).emit('request_accepted', { requestId: id });
        console.log(`Request accepted emitted to receiver: ${receiverId}`);
      } else {
        console.log(`Receiver ${receiverId} not connected or io not initialized`);
      }
    }

    res.status(200).json({ success: true, request: updated });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get accepted friend requests for the user
exports.getAcceptedRequests = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const acceptedRequests = await Request.find({
      status: 'accepted',
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate('senderId', 'name image')
      .populate('receiverId', 'name image');

    const formatted = acceptedRequests.map((r) => {
      const other = r.senderId._id.toString() === userId ? r.receiverId : r.senderId;
      return { _id: other._id, name: other.name, image: other.image };
    });

    console.log(`Accepted requests fetched for user: ${userId}, count: ${formatted.length}`);
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching accepted requests:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};