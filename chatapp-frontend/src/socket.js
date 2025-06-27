import { io } from 'socket.io-client';
import { server_url } from '../Service/server_url';

const socket = io(server_url, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

export default socket;