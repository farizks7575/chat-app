import { io } from 'socket.io-client';
import { server_url } from '../Service/server_url';

const socket = io(server_url, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Socket.IO connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket.IO disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
});

socket.on('reconnect', () => {
  console.log('Socket.IO reconnected');
  const userId = sessionStorage.getItem('userId');
  if (userId) {
    socket.emit('register_user', userId);
  }
});

export default socket;