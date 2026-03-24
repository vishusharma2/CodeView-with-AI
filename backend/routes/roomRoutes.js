const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Room = require("../models/Room");
const logger = require("../logger");
const { JWT_SECRET } = require("../middleware/auth");

// POST: Create a new room
router.post("/", async (req, res) => {
  try {
    const { roomId, password, username } = req.body;

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

    // Issue JWT token for the creator
    const token = jwt.sign(
      { roomId, username: username || "anonymous" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({ 
      success: true, 
      message: "Room created successfully",
      roomId,
      token
    });
  } catch (err) {
    logger.error("Room creation error:", err);
    return res.status(500).json({ error: "Failed to create room" });
  }
});

// POST: Verify room password and issue JWT
router.post("/verify", async (req, res) => {
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

    if (!isValid) {
      return res.json({ valid: false });
    }

    // Issue JWT token with roomId and username
    const { username } = req.body;
    const token = jwt.sign(
      { roomId, username: username || "anonymous" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({ valid: true, token });
  } catch (err) {
    logger.error("Password verification error:", err);
    return res.status(500).json({ error: "Failed to verify password" });
  }
});

// GET: Check if a room exists (lightweight)
router.get("/:roomId/exists", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).select("_id").lean();
    return res.json({ exists: !!room });
  } catch (err) {
    logger.error("Room existence check error:", err);
    return res.status(500).json({ error: "Failed to check room" });
  }
});

module.exports = router;
