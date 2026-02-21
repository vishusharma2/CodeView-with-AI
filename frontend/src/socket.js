import { io } from 'socket.io-client';
export const initSocket = async () => {
    const token = localStorage.getItem('codeview-token');
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
        path: '/socket.io', // Use Vite's proxy
        auth: { token }, // JWT token for authentication
    };
    // Use environment variable for backend URL in production, fallback to current origin for development
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    
    return io(backendUrl, options);
};