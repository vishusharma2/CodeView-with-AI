require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const ACTIONS = require("./Actions.cjs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Room = require("./models/Room");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("./logger");

// Google Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codeview")
.then(() => logger.log("✅ MongoDB connected successfully"))
.catch((err) => logger.error("❌ MongoDB connection error:", err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for local network testing
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: true, // Allow all origins for local network testing
  credentials: true,
}));

app.use(express.json());

/************************************************************
 * Health Check
 ************************************************************/
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

/************************************************************
 * Room Password Management
 ************************************************************/
app.post("/api/rooms", async (req, res) => {
  try {
    const { roomId, password } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ error: "roomId and password are required" });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(409).json({ error: "Room already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create room
    const room = new Room({
      roomId,
      password: hashedPassword,
    });

    await room.save();

    return res.json({ 
      success: true, 
      message: "Room created successfully",
      roomId 
    });
  } catch (err) {
    logger.error("Room creation error:", err);
    return res.status(500).json({ error: "Failed to create room" });
  }
});

app.post("/api/rooms/verify", async (req, res) => {
  try {
    const { roomId, password } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ error: "roomId and password are required" });
    }

    // Find room
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.json({ valid: false });
    }

    // Compare password
    const isValid = await bcrypt.compare(password, room.password);

    return res.json({ valid: isValid });
  } catch (err) {
    logger.error("Password verification error:", err);
    return res.status(500).json({ error: "Failed to verify password" });
  }
});

/************************************************************
 * Multi-File System - CRUD endpoints
 ************************************************************/

// Valid file extensions and their languages
const VALID_EXTENSIONS = {
  '.js': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.rb': 'ruby',
  '.php': 'php',
  '.go': 'go',
  '.rs': 'rust',
  '.ts': 'typescript',
  '.html': 'html',
  '.css': 'css'
};

// Helper: Get language from filename
const getLanguageFromFile = (fileName) => {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return VALID_EXTENSIONS[ext] || null;
};

// GET: Get all files for a room
app.get("/api/rooms/:roomId/files", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    return res.json({ files: room.files || [] });
  } catch (err) {
    logger.error("Get files error:", err);
    return res.status(500).json({ error: "Failed to get files" });
  }
});

// POST: Create a new file
app.post("/api/rooms/:roomId/files", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;
    
    if (!name || !name.includes('.')) {
      return res.status(400).json({ error: "File name with extension is required" });
    }
    
    const language = getLanguageFromFile(name);
    if (!language) {
      const validExts = Object.keys(VALID_EXTENSIONS).join(', ');
      return res.status(400).json({ 
        error: `Invalid extension. Valid: ${validExts}` 
      });
    }
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    // Check if file already exists
    if (room.files.some(f => f.name === name)) {
      return res.status(400).json({ error: "File already exists" });
    }
    
    room.files.push({ name, content: '', language });
    await room.save();
    
    return res.json({ success: true, file: { name, content: '', language } });
  } catch (err) {
    logger.error("Create file error:", err);
    return res.status(500).json({ error: "Failed to create file" });
  }
});

// PUT: Update file content
app.put("/api/rooms/:roomId/files/:fileName", async (req, res) => {
  try {
    const { roomId, fileName } = req.params;
    const { content } = req.body;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    const fileIndex = room.files.findIndex(f => f.name === fileName);
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }
    
    room.files[fileIndex].content = content || '';
    await room.save();
    
    return res.json({ success: true });
  } catch (err) {
    logger.error("Update file error:", err);
    return res.status(500).json({ error: "Failed to update file" });
  }
});

// DELETE: Delete a file
app.delete("/api/rooms/:roomId/files/:fileName", async (req, res) => {
  try {
    const { roomId, fileName } = req.params;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    const fileIndex = room.files.findIndex(f => f.name === fileName);
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }
    
    // Don't allow deleting the last file
    if (room.files.length === 1) {
      return res.status(400).json({ error: "Cannot delete the last file" });
    }
    
    room.files.splice(fileIndex, 1);
    await room.save();
    
    return res.json({ success: true });
  } catch (err) {
    logger.error("Delete file error:", err);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

/************************************************************
 * AI Code Suggestions
 ************************************************************/
// Simple rate limiting: track requests per IP
const aiRequestCounts = new Map();

app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { code, cursorPosition, language } = req.body;

    if (!code || cursorPosition === undefined) {
      return res.status(400).json({ error: "code and cursorPosition are required" });
    }

    // Rate limiting: max 10 requests per minute per IP
    const clientIP = req.ip;
    const now = Date.now();
    const requestData = aiRequestCounts.get(clientIP) || { count: 0, resetTime: now + 60000 };
    
    if (now > requestData.resetTime) {
      requestData.count = 0;
      requestData.resetTime = now + 60000;
    }
    
    if (requestData.count >= 10) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    }
    
    requestData.count++;
    aiRequestCounts.set(clientIP, requestData);

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ suggestion: null, error: "Gemini API key not configured" });
    }

    // Split code at cursor position
    const codeBefore = code.substring(0, cursorPosition);
    const codeAfter = code.substring(cursorPosition);

    // Create prompt for Gemini
    const prompt = `You are a code completion AI assistant. Complete the code at the cursor position with 1-2 lines of code.

Language: ${language || "javascript"}

Code before cursor:
${codeBefore}

Code after cursor:
${codeAfter}

Provide ONLY the next 1-2 lines of code to complete at the cursor position. No explanations, no markdown formatting, just raw code.`;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestion = response.text()?.trim() || null;

    return res.json({ suggestion });
  } catch (err) {
    logger.error("AI suggestion error:", err.message);
    // Don't expose API errors to client
    return res.json({ suggestion: null });
  }
});

/************************************************************
 * JDoodle Code Execution
 ************************************************************/
const { executeCode } = require("./jdoodleConfig");

app.post("/api/execute-code", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    // Check if JDoodle API credentials are configured
    if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "JDoodle API is not configured. Please add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to your .env file." 
      });
    }

    // Execute code using JDoodle
    const result = await executeCode(code, language, stdin || "");

    // JDoodle returns statusCode 200 for successful execution
    const isSuccess = result.statusCode === 200;

    return res.json({
      success: isSuccess,
      status: isSuccess ? "Success" : "Error",
      stdout: result.output || "",
      stderr: !isSuccess ? result.output : "",
      memory: result.memory,
      cpuTime: result.cpuTime,
      error: !isSuccess ? result.output : null,
    });
  } catch (err) {
    logger.error("Code execution error:", err.message);
    return res.status(500).json({ 
      error: err.message || "Failed to execute code",
      success: false,
    });
  }
});

/************************************************************
 * Socket.IO Real-time Collaborative Editor Logic
 ************************************************************/

const userSocketMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(socketId => {
    return {
      socketId,
      username: userSocketMap[socketId],
    };
  });
}

io.on("connection", (socket) => {
  logger.log("Socket connected:", socket.id);

  /**************** JOIN ROOM *****************/
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    if (!roomId || !username) return;

    userSocketMap[socket.id] = username;
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  /**************** CODE SYNC *****************/
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  /**************** LANGUAGE SYNC *****************/
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  /**************** CURSOR POSITION SYNC *****************/
  socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, username, cursor, color }) => {
    // Broadcast cursor position to all other users in the room
    socket.to(roomId).emit(ACTIONS.CURSOR_POSITION, { 
      username, 
      cursor,
      color,
      socketId: socket.id
    });
  });

  /**************** VIDEO CALL HANDLERS *****************/
  socket.on(ACTIONS.VIDEO_CALL_INVITE, ({ roomId, initiator }) => {
    logger.log(`📞 [SERVER] Received VIDEO_CALL_INVITE from ${initiator} for room ${roomId}`);
    // Broadcast video call invitation to all other members in the room
    socket.to(roomId).emit(ACTIONS.VIDEO_CALL_INVITE, { 
      initiator,
      roomId 
    });
    logger.log(`📞 [SERVER] Broadcasted VIDEO_CALL_INVITE to room ${roomId}`);
  });

  socket.on(ACTIONS.VIDEO_CALL_RESPONSE, ({ roomId, username, accepted }) => {
    logger.log(`📞 [SERVER] Received VIDEO_CALL_RESPONSE from ${username}: ${accepted ? 'accepted' : 'declined'}`);
    // Broadcast user's response to all members in the room
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_RESPONSE, { 
      username, 
      accepted 
    });
    logger.log(`📞 [SERVER] Broadcasted VIDEO_CALL_RESPONSE to room ${roomId}`);
  });
  

  socket.on(ACTIONS.VIDEO_CALL_LEAVE, ({ roomId, username }) => {
    logger.log(`📞 [SERVER] ${username} left the video call in room ${roomId}`);
    // Notify all members that this user left the call
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_LEAVE, { username });
  });

  socket.on(ACTIONS.VIDEO_CALL_END, ({ roomId }) => {
    // Notify all members that the video call has ended
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_END);
  });

  /**************** WEBRTC SIGNALING *****************/
  socket.on(ACTIONS.WEBRTC_OFFER, ({ roomId, offer, targetSocketId }) => {
    // Forward WebRTC offer to specific peer
    io.to(targetSocketId).emit(ACTIONS.WEBRTC_OFFER, {
      offer,
      senderSocketId: socket.id,
    });
  });

  socket.on(ACTIONS.WEBRTC_ANSWER, ({ roomId, answer, targetSocketId }) => {
    // Forward WebRTC answer to specific peer
    io.to(targetSocketId).emit(ACTIONS.WEBRTC_ANSWER, {
      answer,
      senderSocketId: socket.id,
    });
  });

  socket.on(ACTIONS.WEBRTC_ICE_CANDIDATE, ({ roomId, candidate, targetSocketId }) => {
    // Forward ICE candidate to specific peer
    io.to(targetSocketId).emit(ACTIONS.WEBRTC_ICE_CANDIDATE, {
      candidate,
      senderSocketId: socket.id,
    });
  });

  /**************** DISCONNECT LOGIC *****************/
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter(r => r !== socket.id);

    rooms.forEach(roomId => {
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
  });

  socket.on("disconnect", () => {
    delete userSocketMap[socket.id];
  });
});

/************************************************************
 * Start Server
 ************************************************************/
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.log(`Server is running on port ${PORT}`));
