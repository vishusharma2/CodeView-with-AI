import { io } from 'socket.io-client';
export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
        path: '/socket.io', // Use Vite's proxy
    };
    // Use current origin (works on both localhost and network IP)
    return io(window.location.origin, options);
};