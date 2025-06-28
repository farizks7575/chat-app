const Message = require('../Model/messageSchema');

let io;
let userSockets = {};

exports.injectIO = (socketIO) => {
  io = socketIO;
};

exports.setUserSockets = (map) => {
  userSockets = map;
};

exports.sendMessage = async (req, res) => {
  const { sender, receiver, content } = req.body;

  if (!sender || !receiver || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newMessage = new Message({ sender, receiver, content });
    await newMessage.save();
    console.log(`Message saved: ${newMessage._id}`);

    const messageData = {
      sender,
      receiver,
      content,
      timestamp: newMessage.timestamp,
      _id: newMessage._id.toString(),
    };

    if (io && userSockets[receiver]) {
      io.to(userSockets[receiver]).emit('receive_message', messageData);
      console.log(`Message emitted to receiver: ${receiver}`);
    }
    if (io && userSockets[sender]) {
      io.to(userSockets[sender]).emit('receive_message', messageData);
      console.log(`Message emitted to sender: ${sender}`);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).json({ error: 'Error saving message' });
  }
};

exports.getMessages = async (req, res) => {
  const { user1, user2 } = req.params;
  console.log(`Fetching messages for user1: ${user1}, user2: ${user2}`);

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ timestamp: 1 });
    console.log(`Messages fetched: ${messages.length}`);
    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    console.log(`Message deleted: ${messageId}`);
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Error deleting message' });
  }
};