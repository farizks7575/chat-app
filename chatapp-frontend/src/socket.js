import { io } from 'socket.io-client';
import { server_url } from '../Service/server_url';

const socket = io(server_url); // ✅ No CORS needed here

export default socket;
