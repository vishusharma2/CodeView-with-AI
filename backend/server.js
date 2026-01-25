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
const Annotation = require("./models/Annotation");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("./logger");

// Google Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codeview")
.then(() => logger.log("✅ MongoDB connected successfully"))
.catch((err) => {
  logger.error("❌ MongoDB connection error:", err.message);
  logger.log("⚠️  Server will continue running, but database features may not work.");
  logger.log("💡 Please check your MongoDB connection string or ensure your MongoDB cluster is running.");
});

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
 * Annotation API (Whiteboard Persistence)
 ************************************************************/
// GET: Load annotations for a room
app.get("/api/rooms/:roomId/annotations", async (req, res) => {
  try {
    const { roomId } = req.params;
    const annotation = await Annotation.findOne({ roomId });
    
    return res.json({
      success: true,
      drawingData: annotation ? annotation.drawingData : []
    });
  } catch (err) {
    logger.error("Load annotations error:", err);
    return res.status(500).json({ error: "Failed to load annotations" });
  }
});

// PUT: Save annotations for a room
app.put("/api/rooms/:roomId/annotations", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { drawingData } = req.body;
    
    await Annotation.findOneAndUpdate(
      { roomId },
      { 
        roomId,
        drawingData,
        lastActivity: new Date()
      },
      { upsert: true, new: true }
    );
    
    return res.json({ success: true });
  } catch (err) {
    logger.error("Save annotations error:", err);
    return res.status(500).json({ error: "Failed to save annotations" });
  }
});

// Cleanup cron: Delete annotations inactive for 10 minutes
// Run every 5 minutes
setInterval(async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await Annotation.deleteMany({
      lastActivity: { $lt: tenMinutesAgo }
    });
    
    if (result.deletedCount > 0) {
      logger.log(`🧹 Cleaned up ${result.deletedCount} inactive annotation(s)`);
    }
  } catch (err) {
    logger.error("Annotation cleanup error:", err);
  }
}, 5 * 60 * 1000); // Every 5 minutes

/************************************************************
 * AI Code Suggestions
 ************************************************************/
// Simple rate limiting: track requests per IP
const aiRequestCounts = new Map();

// Helper function to call Ollama API for code suggestions (short responses)
async function getOllamaCodeSuggestion(prompt, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const requestBody = {
      model: process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 150 // Increased from 100 to allow slightly longer completions
        // Removed stop sequences - they were causing empty responses
      }
    };
    
    logger.log('[Ollama] Request body:', JSON.stringify(requestBody).substring(0, 200));
    
    const response = await fetch(`${process.env.OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }
    
    const data = await response.json();
    logger.log('[Ollama] Raw response keys:', Object.keys(data));
    logger.log('[Ollama] Response field:', data.response);
    logger.log('[Ollama] Response type:', typeof data.response);
    logger.log('[Ollama] Response length:', data.response?.length);
    
    // Clean the response - remove markdown code fences
    let cleanResponse = data.response?.trim() || '';
    
    // Strip markdown code blocks (```javascript ... ``` or ```...```)
    cleanResponse = cleanResponse.replace(/^```(?:javascript|js|typescript|ts|python|java|cpp|c)?\s*/i, '');
    cleanResponse = cleanResponse.replace(/```\s*$/i, '');
    cleanResponse = cleanResponse.trim();
    
    const result = cleanResponse || null;
    logger.log('[Ollama] Final result:', result ? `"${result}"` : 'NULL');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function to call Ollama API for chat (longer responses)
async function getOllamaChat(prompt, timeoutMs = 30000) { // Increased to 30s for slower responses
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(`${process.env.OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 500, // Allow longer responses for chat
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.response?.trim() || null;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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

    // Split code at cursor position and limit context to reduce tokens
    const codeBefore = code.substring(0, cursorPosition);
    const codeAfter = code.substring(cursorPosition);
    
    // Get only the last 10 lines before cursor and next 5 lines after
    const beforeLines = codeBefore.split('\n');
    const afterLines = codeAfter.split('\n');
    
    const contextBefore = beforeLines.slice(-10).join('\n');
    const contextAfter = afterLines.slice(0, 5).join('\n');

    // Create concise prompt
    const prompt = `You are an expert ${language || "javascript"} programmer. Complete the following code by providing the next 1-2 lines that should come immediately after the cursor.

Code context (last 10 lines before cursor):
${contextBefore}

<COMPLETE_HERE>

Code after cursor (next 5 lines):
${contextAfter}

Provide ONLY the completion code (1-2 lines), no explanations or markdown.`;

    let suggestion = null;
    let usedModel = 'none';

    // Try Ollama first (local deepseek-coder)
    if (process.env.OLLAMA_API_URL && process.env.OLLAMA_MODEL) {
      try {
        logger.log('🤖 Trying Ollama (deepseek-coder)...');
        logger.log('Prompt preview:', prompt.substring(0, 100) + '...');
        suggestion = await getOllamaCodeSuggestion(prompt);
        usedModel = 'ollama';
        logger.log('✅ Ollama responded successfully');
        logger.log('Suggestion received:', suggestion ? `"${suggestion.substring(0, 50)}..."` : 'EMPTY');
      } catch (ollamaErr) {
        logger.log(`⚠️ Ollama failed (${ollamaErr.message}), falling back to Gemini...`);
        
        // Fallback to Gemini
        if (process.env.GEMINI_API_KEY) {
          try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            suggestion = response.text()?.trim() || null;
            usedModel = 'gemini';
            logger.log('✅ Gemini responded successfully');
          } catch (geminiErr) {
            logger.error('❌ Gemini also failed:', geminiErr.message);
          }
        }
      }
    } else {
      // Ollama not configured, use Gemini directly
      if (process.env.GEMINI_API_KEY) {
        try {
          logger.log('🤖 Using Gemini (Ollama not configured)...');
          const result = await model.generateContent(prompt);
          const response = await result.response;
          suggestion = response.text()?.trim() || null;
          usedModel = 'gemini';
          logger.log('✅ Gemini responded successfully');
        } catch (geminiErr) {
          logger.error('❌ Gemini failed:', geminiErr.message);
        }
      } else {
        logger.error('❌ No AI service configured');
      }
    }

    return res.json({ suggestion, model: usedModel });
  } catch (err) {
    logger.error("AI suggestion error:", err.message);
    // Don't expose API errors to client
    return res.json({ suggestion: null, model: 'none' });
  }
});

/************************************************************
 * Nova AI Chat Assistant
 ************************************************************/
app.post("/api/nova-ai/chat", async (req, res) => {
  try {
    const { message, code, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Create prompt with limited coding context to save tokens
    let codeContext = '';
    if (code) {
      // Limit code to first and last 25 lines (max 50 lines total)
      const lines = code.split('\n');
      let truncatedCode = code;
      
      if (lines.length > 50) {
        const firstPart = lines.slice(0, 25).join('\n');
        const lastPart = lines.slice(-25).join('\n');
        truncatedCode = `${firstPart}\n... (${lines.length - 50} lines omitted) ...\n${lastPart}`;
      }
      
      codeContext = `Current code (${language || 'javascript'}):\n\`\`\`${language || 'javascript'}\n${truncatedCode}\n\`\`\`\n\n`;
    }
    
    const prompt = `You are Nova AI, a helpful coding assistant.

${codeContext}User: ${message}

Provide a concise, helpful response.`;

    let reply = null;
    let usedModel = 'none';

    // Try Ollama first (local deepseek-coder)
    if (process.env.OLLAMA_API_URL && process.env.OLLAMA_MODEL) {
      try {
        logger.log('🤖 [Nova AI] Trying Ollama (deepseek-coder)...');
        reply = await getOllamaChat(prompt);
        usedModel = 'ollama';
        logger.log('✅ [Nova AI] Ollama responded successfully');
      } catch (ollamaErr) {
        logger.log(`⚠️ [Nova AI] Ollama failed (${ollamaErr.message}), falling back to Gemini...`);
        
        // Fallback to Gemini
        if (process.env.GEMINI_API_KEY) {
          try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            reply = response.text()?.trim() || null;
            usedModel = 'gemini';
            logger.log('✅ [Nova AI] Gemini responded successfully');
          } catch (geminiErr) {
            logger.error('❌ [Nova AI] Gemini also failed:', geminiErr.message);
          }
        }
      }
    } else {
      // Ollama not configured, use Gemini directly
      if (process.env.GEMINI_API_KEY) {
        try {
          logger.log('🤖 [Nova AI] Using Gemini (Ollama not configured)...');
          const result = await model.generateContent(prompt);
          const response = await result.response;
          reply = response.text()?.trim() || null;
          usedModel = 'gemini';
          logger.log('✅ [Nova AI] Gemini responded successfully');
        } catch (geminiErr) {
          logger.error('❌ [Nova AI] Gemini failed:', geminiErr.message);
        }
      } else {
        logger.error('❌ [Nova AI] No AI service configured');
      }
    }

    if (!reply) {
      return res.status(500).json({ 
        error: "Failed to get AI response",
        success: false 
      });
    }

    return res.json({ success: true, reply, model: usedModel });
  } catch (err) {
    logger.error("Nova AI error:", err.message);
    return res.status(500).json({ 
      error: "Failed to get AI response",
      success: false 
    });
  }
});

/************************************************************
 * Code Execution (Judge0 + JDoodle Fallback)
 ************************************************************/
const judge0 = require("./judge0Config");
const jdoodle = require("./jdoodleConfig");

app.post("/api/execute-code", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    let result;
    let usedExecutor = "none";

    // Try Judge0 first (self-hosted, supports libraries)
    if (process.env.JUDGE0_API_URL) {
      try {
        result = await judge0.executeCode(code, language, stdin || "");
        usedExecutor = "judge0";
        
        // Judge0 status 3 = "Accepted" (success)
        const isSuccess = result.statusCode === 3;

        let stdout = result.output || "";
        let image = null;

        // Parse for embedded images (matplotlib, etc.)
        const imgStart = "IMAGE_START";
        const imgEnd = "IMAGE_END";

        if (stdout.includes(imgStart) && stdout.includes(imgEnd)) {
          const parts = stdout.split(imgStart);
          const preText = parts[0];
          const imgPart = parts[1].split(imgEnd);
          const base64Img = imgPart[0].trim();
          const postText = imgPart[1] || "";

          stdout = (preText + postText).trim();
          image = base64Img;
        }

        return res.json({
          success: isSuccess,
          status: result.statusDescription || (isSuccess ? "Success" : "Error"),
          stdout: stdout,
          stderr: result.error || "",
          memory: result.memory,
          time: result.cpuTime,
          error: result.error || null,
          image: image,
          executor: "judge0"
        });
      } catch (judge0Err) {
        logger.log("Judge0 failed, falling back to JDoodle:", judge0Err.message);
        // Fall through to JDoodle
      }
    }

    // Fallback to JDoodle
    if (process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET) {
      result = await jdoodle.executeCode(code, language, stdin || "");
      usedExecutor = "jdoodle";

      // JDoodle returns statusCode 200 for successful execution
      const isSuccess = result.statusCode === 200;

      return res.json({
        success: isSuccess,
        status: isSuccess ? "Success" : "Error",
        stdout: result.output || "",
        stderr: !isSuccess ? result.output : "",
        memory: result.memory,
        time: result.cpuTime,
        error: !isSuccess ? result.output : null,
        image: null,
        executor: "jdoodle"
      });
    }

    // Neither configured
    return res.status(500).json({
      error: "No code execution service configured. Add JUDGE0_API_URL or JDOODLE credentials to .env",
      success: false
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
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, fileName }) => {
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code, fileName });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, fileName }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code, fileName });
  });

  /**************** LANGUAGE SYNC *****************/
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  /**************** CURSOR POSITION SYNC *****************/
  /**************** CURSOR POSITION SYNC *****************/
  socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, username, cursor, color, fileName }) => {
    // Broadcast cursor position to all other users in the room
    socket.to(roomId).emit(ACTIONS.CURSOR_POSITION, { 
      username, 
      cursor,
      color,
      socketId: socket.id,
      fileName // Forward fileName
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
    
    // Track video call participants when user accepts
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
    
    // Broadcast user's response to all members in the room
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_RESPONSE, { 
      username, 
      accepted 
    });
    logger.log(`📞 [SERVER] Broadcasted VIDEO_CALL_RESPONSE to room ${roomId}`);
  });
  

  socket.on(ACTIONS.VIDEO_CALL_LEAVE, ({ roomId, username }) => {
    logger.log(`📞 [SERVER] ${username} left the video call in room ${roomId}`);
    
    // Track video call participants per room (initialize if needed)
    if (!global.videoCallParticipants) {
      global.videoCallParticipants = {};
    }
    if (!global.videoCallParticipants[roomId]) {
      global.videoCallParticipants[roomId] = new Set();
    }
    
    // Remove the leaving user from participants
    global.videoCallParticipants[roomId].delete(username);
    
    logger.log(`📞 [SERVER] Participants in ${roomId} after ${username} left:`, Array.from(global.videoCallParticipants[roomId]));
    
    // Check if this was the last person in the call
    if (global.videoCallParticipants[roomId].size === 0) {
      logger.log(`📞 [SERVER] Last person left room ${roomId} - ending call for everyone`);
      // Notify all members that the video call has ended
      io.to(roomId).emit(ACTIONS.VIDEO_CALL_END);
      // Clean up
      delete global.videoCallParticipants[roomId];
    } else {
      // Notify remaining members that this user left
      io.to(roomId).emit(ACTIONS.VIDEO_CALL_LEAVE, { username });
    }
  });

  socket.on(ACTIONS.VIDEO_CALL_END, ({ roomId }) => {
    // Notify all members that the video call has ended
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_END);
    // Clean up participants tracking
    if (global.videoCallParticipants && global.videoCallParticipants[roomId]) {
      delete global.videoCallParticipants[roomId];
      logger.log(`📞 [SERVER] Cleaned up video call participants for room ${roomId}`);
    }
  });

  socket.on(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, ({ roomId, requester }) => {
    logger.log(`📞 [SERVER] ${requester} requesting to rejoin call in room ${roomId}`);
    // Broadcast rejoin request to all members in the room (host will filter)
    socket.to(roomId).emit(ACTIONS.VIDEO_CALL_REJOIN_REQUEST, { requester });
  });

  socket.on(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, ({ roomId, requester, approved }) => {
    logger.log(`📞 [SERVER] Rejoin ${approved ? 'approved' : 'denied'} for ${requester} in room ${roomId}`);
    // Broadcast response to all members
    io.to(roomId).emit(ACTIONS.VIDEO_CALL_REJOIN_RESPONSE, { requester, approved });
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

  /**************** WHITEBOARD *****************/
  socket.on(ACTIONS.WHITEBOARD_DRAW, (data) => {
    // Broadcast draw event to all other users in room
    socket.to(data.roomId).emit(ACTIONS.WHITEBOARD_DRAW, data);
  });

  socket.on(ACTIONS.WHITEBOARD_CLEAR, ({ roomId }) => {
    // Broadcast clear event to all other users in room
    socket.to(roomId).emit(ACTIONS.WHITEBOARD_CLEAR);
  });

  /**************** FILE SYNC *****************/
  socket.on(ACTIONS.FILE_CREATE, ({ roomId, file }) => {
    // Broadcast new file to all other users in room
    socket.to(roomId).emit(ACTIONS.FILE_CREATE, { file });
    logger.log(`📁 File created: ${file.name} in room ${roomId}`);
  });

  socket.on(ACTIONS.FILE_DELETE, ({ roomId, fileName }) => {
    // Broadcast file deletion to all other users in room
    socket.to(roomId).emit(ACTIONS.FILE_DELETE, { fileName });
    logger.log(`🗑️ File deleted: ${fileName} in room ${roomId}`);
  });

  socket.on(ACTIONS.FILE_SYNC, ({ roomId, files }) => {
    // Sync files list to all other users in room
    socket.to(roomId).emit(ACTIONS.FILE_SYNC, { files });
  });

  /**************** CODE OUTPUT SYNC *****************/
  socket.on(ACTIONS.CODE_OUTPUT, ({ roomId, output, executedBy, fileName }) => {
    // Broadcast code execution output to all other users in room
    socket.to(roomId).emit(ACTIONS.CODE_OUTPUT, { output, executedBy, fileName });
    logger.log(`▶️ Code executed by ${executedBy} in room ${roomId}`);
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
