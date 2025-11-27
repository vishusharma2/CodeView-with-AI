import { io } from 'socket.io-client';
export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    return io(backendUrl, options);
};