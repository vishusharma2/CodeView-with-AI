const express = require("express");
const router = express.Router();
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");

// Helper function to call Ollama API for chat (longer responses)
async function getOllamaChat(prompt, timeoutMs = 30000) {
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
          num_predict: 500,
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

// POST: Nova AI Chat
router.post("/chat", authenticateToken, async (req, res) => {
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
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

module.exports = router;
