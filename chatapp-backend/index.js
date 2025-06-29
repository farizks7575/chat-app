
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const router = require('./Router/router');
const { injectIO, setUserSockets } = require('./Controller/messageController');
require('./DB/connection');

const app = express();

const allowedOrigins = [
  'https://bucolic-lebkuchen-923ca8.netlify.app',
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS request from:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/Uploads', express.static('./Uploads')); // Kept for legacy compatibility, but Cloudinary is used
app.use(router);

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const users = {};
injectIO(io);
setUserSockets(users);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register_user', (userId) => {
    if (userId) {
      users[userId] = socket.id;
      socket.join(userId);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    } else {
      console.log('Invalid userId received:', userId);
    }
  });

  socket.on('send_message', (message) => {
    const { sender, receiver, content, timestamp, _id } = message;
    if (receiver && users[receiver]) {
      io.to(users[receiver]).emit('receive_message', {
        sender,
        receiver,
        content,
        timestamp,
        _id,
      });
    }
    if (users[sender]) {
      io.to(users[sender]).emit('receive_message', {
        sender,
        receiver,
        content,
        timestamp,
        _id,
      });
    }
    console.log(`Message sent from ${sender} to ${receiver} with ID ${_id}`);
  });

  socket.on('message_deleted', ({ messageId, receiver }) => {
    if (receiver && users[receiver]) {
      io.to(users[receiver]).emit('message_deleted', { messageId });
      console.log(`Message ${messageId} deletion notified to ${receiver}`);
    }
    const senderSocketId = socket.id;
    const senderId = Object.keys(users).find((key) => users[key] === senderSocketId);
    if (senderId && users[senderId]) {
      io.to(users[senderId]).emit('message_deleted', { messageId });
      console.log(`Message ${messageId} deletion notified to sender ${senderId}`);
    }
  });

  socket.on('request_accepted', () => {
    Object.keys(users).forEach((userId) => {
      io.to(users[userId]).emit('request_accepted');
    });
  });

  socket.on('disconnect', (reason) => {
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`User ${userId} disconnected: ${reason}`);
        break;
      }
    }
    console.log('Socket disconnected:', socket.id, 'Reason:', reason);
  });
});

console.log('Environment variables:', {
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
