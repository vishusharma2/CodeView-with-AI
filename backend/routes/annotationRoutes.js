const express = require("express");
const router = express.Router();
const Annotation = require("../models/Annotation");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");

// Shared activity logs map (also used by socket handler)
const roomActivityLogs = new Map();

// GET: Load annotations for a room
router.get("/:roomId/annotations", authenticateToken, async (req, res) => {
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
router.put("/:roomId/annotations", authenticateToken, async (req, res) => {
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

// GET: Activity logs for a room (host-only)
router.get("/:roomId/logs", (req, res) => {
  const { roomId } = req.params;
  const logs = roomActivityLogs.get(roomId) || [];
  return res.json({ success: true, logs });
});

// DELETE: Clear activity logs for a room
router.delete("/:roomId/logs", (req, res) => {
  const { roomId } = req.params;
  roomActivityLogs.set(roomId, []);
  return res.json({ success: true });
});

// Cleanup cron: Delete annotations inactive for 10 minutes (runs every 5 min)
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
}, 5 * 60 * 1000);

module.exports = { router, roomActivityLogs };
