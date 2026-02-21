const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");

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
router.get("/:roomId/files", authenticateToken, async (req, res) => {
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
router.post("/:roomId/files", authenticateToken, async (req, res) => {
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
router.put("/:roomId/files/:fileName", authenticateToken, async (req, res) => {
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
router.delete("/:roomId/files/:fileName", authenticateToken, async (req, res) => {
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

module.exports = router;
