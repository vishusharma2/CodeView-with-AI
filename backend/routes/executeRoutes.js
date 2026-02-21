const express = require("express");
const router = express.Router();
const judge0 = require("../judge0Config");
const jdoodle = require("../jdoodleConfig");
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");

// POST: Execute code
router.post("/execute-code", authenticateToken, async (req, res) => {
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

module.exports = router;
