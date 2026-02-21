const jwt = require("jsonwebtoken");
const ACTIONS = require("../Actions.cjs");
const logger = require("../logger");
const { JWT_SECRET } = require("../middleware/auth");
const { roomActivityLogs } = require("../routes/annotationRoutes");

const userSocketMap = {};
const roomHosts = new Map();

// Helper: add activity log and broadcast to room
function addActivityLog(io, roomId, type, username, details) {
  const logEntry = { type, username, details, timestamp: Date.now() };
  if (!roomActivityLogs.has(roomId)) {
    roomActivityLogs.set(roomId, []);
  }
  roomActivityLogs.get(roomId).push(logEntry);
  // Broadcast to all in room
  io.to(roomId).emit(ACTIONS.ACTIVITY_LOG, logEntry);
}

function getAllConnectedClients(io, roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(socketId => {
    return {
      socketId,
      username: userSocketMap[socketId],
    };
  });
}

function initSocketHandlers(io) {
  // Socket.IO JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.log("Socket connected:", socket.id, "| User:", socket.user?.username);

    /**************** JOIN ROOM *****************/
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
      if (!roomId || !username) return;

      userSocketMap[socket.id] = username;
      socket.join(roomId);

      // Track room host (first joiner)
      if (!roomHosts.has(roomId)) {
        roomHosts.set(roomId, username);
        logger.log(`👑 ${username} is host of room ${roomId}`);
      }

      const clients = getAllConnectedClients(io, roomId);
      const host = roomHosts.get(roomId);

      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
          host,
        });
      });

      // Activity log
      addActivityLog(io, roomId, 'join', username, 'joined the room');
    });

    /**************** CODE SYNC *****************/
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, fileName }) => {
      socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code, fileName });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, fileName }) => {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code, fileName });
    });

    /**************** LANGUAGE SYNC *****************/
    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
      socket.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
      addActivityLog(io, roomId, 'language-change', userSocketMap[socket.id], `changed language to "${language}"`);
    });

    /**************** CURSOR POSITION SYNC *****************/
    socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, username, cursor, color, fileName }) => {
      socket.to(roomId).emit(ACTIONS.CURSOR_POSITION, { 
        username, 
        cursor,
        color,
        socketId: socket.id,
        fileName
      });
    });

    /**************** VIDEO CALL HANDLERS *****************/
    socket.on(ACTIONS.VIDEO_CALL_INVITE, ({ roomId, initiator }) => {
      logger.log(`📞 [SERVER] Received VIDEO_CALL_INVITE from ${initiator} for room ${roomId}`);
      socket.to(roomId).emit(ACTIONS.VIDEO_CALL_INVITE, { 
        initiator,
        roomId 
      });
      logger.log(`📞 [SERVER] Broadcasted VIDEO_CALL_INVITE to room ${roomId}`);
      addActivityLog(io, roomId, 'video-call', initiator, 'started a video call');
    });

    socket.on(ACTIONS.VIDEO_CALL_RESPONSE, ({ roomId, username, accepted }) => {
      logger.log(`📞 [SERVER] Received VIDEO_CALL_RESPONSE from ${username}: ${accepted ? 'accepted' : 'declined'}`);
      
      if (accepted) {
        if (!global.videoCallParticipants) {
          global.videoCallParticipants = {};
        }
        if (!global.videoCallParticipants[roomId]) {
          global.videoCallParticipants[roomId] = new Set();
        }
        global.videoCallParticipants[roomId].add(username);
        logger.log(`📞 [SERVER] Added ${username} to call in ${roomId}. Total participants:`, Array.from(global.videoCallParticipants[roomId]));
      }
      
      io.to(roomId).emit(ACTIONS.VIDEO_CALL_RESPONSE, { 
        username, 
        accepted 
      });
      logger.log(`📞 [SERVER] Broadcasted VIDEO_CALL_RESPONSE to room ${roomId}`);
      addActivityLog(io, roomId, 'video-call', username, accepted ? 'joined the video call' : 'declined the video call');
    });
    

    socket.on(ACTIONS.VIDEO_CALL_LEAVE, ({ roomId, username }) => {
      logger.log(`📞 [SERVER] ${username} left the video call in room ${roomId}`);
      
      if (!global.videoCallParticipants) {
        global.videoCallParticipants = {};
      }
      if (!global.videoCallParticipants[roomId]) {
        global.videoCallParticipants[roomId] = new Set();
      }
      
      global.videoCallParticipants[roomId].delete(username);
      
      logger.log(`📞 [SERVER] Participants in ${roomId} after ${username} left:`, Array.from(global.videoCallParticipants[roomId]));
      
      if (global.videoCallParticipants[roomId].size === 0) {
        logger.log(`📞 [SERVER] Last person left room ${roomId} - ending call for everyone`);
        io.to(roomId).emit(ACTIONS.VIDEO_CALL_END);
        delete global.videoCallParticipants[roomId];
      } else {
        io.to(roomId).emit(ACTIONS.VIDEO_CALL_LEAVE, { username });
      }
      addActivityLog(io, roomId, 'video-call', username, 'left the video call');
    });

    socket.on(ACTIONS.VIDEO_CALL_END, ({ roomId }) => {
      io.to(roomId).emit(ACTIONS.VIDEO_CALL_END);
      if (global.videoCallParticipants && global.videoCallParticipants[roomId]) {
        delete global.videoCallParticipants[roomId];
        logger.log(`📞 [SERVER] Cleaned up video call participants for room ${roomId}`);
      }
    });

    socket.on(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, ({ roomId, requester }) => {
      logger.log(`📞 [SERVER] ${requester} requesting to rejoin call in room ${roomId}`);
      socket.to(roomId).emit(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, { requester });
    });

    socket.on(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, ({ roomId, requester, approved }) => {
      logger.log(`📞 [SERVER] Rejoin ${approved ? 'approved' : 'denied'} for ${requester} in room ${roomId}`);
      io.to(roomId).emit(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, { requester, approved });
    });

    /**************** WEBRTC SIGNALING *****************/
    socket.on(ACTIONS.WEBRTC_OFFER, ({ roomId, offer, targetSocketId }) => {
      io.to(targetSocketId).emit(ACTIONS.WEBRTC_OFFER, {
        offer,
        senderSocketId: socket.id,
      });
    });

    socket.on(ACTIONS.WEBRTC_ANSWER, ({ roomId, answer, targetSocketId }) => {
      io.to(targetSocketId).emit(ACTIONS.WEBRTC_ANSWER, {
        answer,
        senderSocketId: socket.id,
      });
    });

    socket.on(ACTIONS.WEBRTC_ICE_CANDIDATE, ({ roomId, candidate, targetSocketId }) => {
      io.to(targetSocketId).emit(ACTIONS.WEBRTC_ICE_CANDIDATE, {
        candidate,
        senderSocketId: socket.id,
      });
    });

    /**************** WHITEBOARD *****************/
    socket.on(ACTIONS.WHITEBOARD_DRAW, (data) => {
      socket.to(data.roomId).emit(ACTIONS.WHITEBOARD_DRAW, data);
    });

    socket.on(ACTIONS.WHITEBOARD_CLEAR, ({ roomId }) => {
      socket.to(roomId).emit(ACTIONS.WHITEBOARD_CLEAR);
      addActivityLog(io, roomId, 'whiteboard', userSocketMap[socket.id], 'cleared the whiteboard');
    });

    /**************** FILE SYNC *****************/
    socket.on(ACTIONS.FILE_CREATE, ({ roomId, file }) => {
      socket.to(roomId).emit(ACTIONS.FILE_CREATE, { file });
      logger.log(`📁 File created: ${file.name} in room ${roomId}`);
      addActivityLog(io, roomId, 'file-create', userSocketMap[socket.id], `created file "${file.name}"`);
    });

    socket.on(ACTIONS.FILE_DELETE, ({ roomId, fileName }) => {
      socket.to(roomId).emit(ACTIONS.FILE_DELETE, { fileName });
      logger.log(`🗑️ File deleted: ${fileName} in room ${roomId}`);
      addActivityLog(io, roomId, 'file-delete', userSocketMap[socket.id], `deleted file "${fileName}"`);
    });

    socket.on(ACTIONS.FILE_SYNC, ({ roomId, files }) => {
      socket.to(roomId).emit(ACTIONS.FILE_SYNC, { files });
    });

    /**************** CODE OUTPUT SYNC *****************/
    socket.on(ACTIONS.CODE_OUTPUT, ({ roomId, output, executedBy, fileName }) => {
      socket.to(roomId).emit(ACTIONS.CODE_OUTPUT, { output, executedBy, fileName });
      logger.log(`▶️ Code executed by ${executedBy} in room ${roomId}`);
      addActivityLog(io, roomId, 'code-run', executedBy, `ran code in "${fileName}"`);
    });

    /**************** CHAT & TYPING *****************/
    socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, username, message, timestamp }) => {
      socket.to(roomId).emit(ACTIONS.CHAT_MESSAGE, { username, message, timestamp });
      addActivityLog(io, roomId, 'chat', username, `sent a message`);
    });

    socket.on(ACTIONS.TYPING_START, ({ roomId, username }) => {
      socket.to(roomId).emit(ACTIONS.TYPING_START, { username });
    });

    socket.on(ACTIONS.TYPING_STOP, ({ roomId, username }) => {
      socket.to(roomId).emit(ACTIONS.TYPING_STOP, { username });
    });

    /**************** DISCONNECT LOGIC *****************/
    socket.on("disconnecting", () => {
      const rooms = [...socket.rooms].filter(r => r !== socket.id);
      const disconnectedUser = userSocketMap[socket.id];

      rooms.forEach(roomId => {
        socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: disconnectedUser,
        });

        if (disconnectedUser) {
          addActivityLog(io, roomId, 'leave', disconnectedUser, 'left the room');
        }

        // Check if room is now empty -> cleanup host & logs
        const remainingClients = getAllConnectedClients(io, roomId).filter(
          c => c.socketId !== socket.id
        );
        if (remainingClients.length === 0) {
          roomHosts.delete(roomId);
          roomActivityLogs.delete(roomId);
          logger.log(`🧹 Cleaned up host & logs for empty room ${roomId}`);
        }
      });
    });

    socket.on("disconnect", () => {
      delete userSocketMap[socket.id];
    });
  });
}

module.exports = initSocketHandlers;
