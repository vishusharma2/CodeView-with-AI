const express = require("express");
const router = express.Router();
const logger = require("../logger");
const { authenticateToken } = require("../middleware/auth");

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
        num_predict: 150
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

// POST: Get AI code suggestion
router.post("/suggest", authenticateToken, async (req, res) => {
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
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

module.exports = router;
