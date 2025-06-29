const User = require('../Model/userSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Profile image is required', missing: 'profile' });
    if (!name || !email || !password || !gender) {
      return res.status(400).json({ message: 'All fields are required', missing: { name, email, password, gender } });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'Uploads' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const image = result.secure_url;

    const newUser = new User({ name, email, password: hashedPassword, gender, image });
    await newUser.save();
    console.log(`User registered: ${newUser._id}`);

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
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
    res.status(500).json({ message: 'Server Error', error: error.message });
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
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'Uploads' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      updatedFields.image = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`User updated: ${id}`);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};