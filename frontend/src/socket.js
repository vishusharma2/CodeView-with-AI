import { io } from 'socket.io-client';
export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
        path: '/socket.io', // Use Vite's proxy
    };
    // Use environment variable for backend URL in production, fallback to current origin for development
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    
    return io(backendUrl, options);
};