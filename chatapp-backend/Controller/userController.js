const User = require('../Model/userSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Profile image is required' });

    const image = req.file.filename;

    if (!name || !email || !password || !gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword, gender, image });
    await newUser.save();
    console.log(`User registered: ${newUser._id}`);

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      console.log(`User logged in: ${user._id}`);
      res.status(200).json({ existinguser: user, token });
    } else {
      res.status(406).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getallusers = async (req, res) => {
  try {
    const allUsers = await User.find();
    console.log(`Fetched ${allUsers.length} users`);
    res.status(200).json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json(error);
  }
};

exports.edituserController = async (req, res) => {
  const { id } = req.params;
  const { name, email, gender, password } = req.body;

  try {
    const updatedFields = { name, email, gender };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    }

    if (req.file) {
      updatedFields.image = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`User updated: ${id}`);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};