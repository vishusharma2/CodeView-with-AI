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
    const prompt = `You are an expert ${language || "javascript"} programmer acting as an inline code autocomplete engine.

The user is writing ${language || "javascript"} code. Complete the code by providing ONLY the next 1-2 lines that should come immediately after the cursor position marked by <CURSOR>.

Rules:
- Output ONLY raw ${language || "javascript"} code, nothing else
- Do NOT include markdown, code fences, backticks, explanations, or HTML tags
- Do NOT repeat code that already exists before the cursor
- Provide a natural, idiomatic continuation of the code

Code before cursor:
${contextBefore}<CURSOR>

Code after cursor:
${contextAfter}`;

    let suggestion = null;
    let usedModel = 'none';

    // Helper to clean AI response
    const cleanSuggestion = (raw) => {
      if (!raw) return null;
      let cleaned = raw.trim();
      
      // Strip markdown code fences
      cleaned = cleaned.replace(/^```(?:\w+)?\s*/i, '');
      cleaned = cleaned.replace(/```\s*$/i, '');
      
      // Strip HTML tags that aren't code
      if (cleaned.match(/^<\/?[a-z]+[\s>]/i) && !['<', '<='].some(op => cleaned.startsWith(op + ' '))) {
        // Entire response is an HTML tag — reject it
        return null;
      }
      
      // Remove leading/trailing quotes if the AI wrapped the whole thing
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        if (cleaned.split('\n').length === 1) {
          cleaned = cleaned.slice(1, -1);
        }
      }
      
      cleaned = cleaned.trim();
      
      // Reject empty or too-short suggestions
      if (!cleaned || cleaned.length < 2) return null;
      
      // Reject if it looks like an explanation rather than code
      if (cleaned.toLowerCase().startsWith('the ') || 
          cleaned.toLowerCase().startsWith('this ') ||
          cleaned.toLowerCase().startsWith('here ') ||
          cleaned.toLowerCase().startsWith('note:')) {
        return null;
      }
      
      return cleaned;
    };

    // Try Ollama first (local deepseek-coder)
    if (process.env.OLLAMA_API_URL && process.env.OLLAMA_MODEL) {
      try {
        logger.log('🤖 Trying Ollama (deepseek-coder)...');
        logger.log('Prompt preview:', prompt.substring(0, 100) + '...');
        suggestion = await getOllamaCodeSuggestion(prompt);
        suggestion = cleanSuggestion(suggestion);
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
            suggestion = cleanSuggestion(response.text());
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
          suggestion = cleanSuggestion(response.text());
          usedModel = 'gemini';
          logger.log('✅ Gemini responded successfully');
        } catch (geminiErr) {
          logger.error('❌ Gemini failed:', geminiErr.message);
        }
      } else {
        logger.error('❌ No AI service configured');
      }
    }
    // Post-process: strip any echoed code context from the suggestion
    if (suggestion) {
      // Normalize line endings
      let normalized = suggestion.replace(/\r\n/g, '\n').trim();
      const normalizedBefore = contextBefore.replace(/\r\n/g, '\n');
      
      // If AI echoed back the code before cursor, strip it
      if (normalizedBefore.length > 0 && normalized.startsWith(normalizedBefore)) {
        normalized = normalized.substring(normalizedBefore.length);
      } else {
        // Try to find the last line before cursor within the suggestion
        const lastLine = normalizedBefore.split('\n').pop()?.trim();
        if (lastLine && lastLine.length > 3) {
          const idx = normalized.indexOf(lastLine);
          if (idx !== -1) {
            normalized = normalized.substring(idx + lastLine.length);
          }
        }
      }
      
      suggestion = normalized.trim() || null;
    }

    return res.json({ suggestion, model: usedModel });
  } catch (err) {
    logger.error("AI suggestion error:", err.message);
    // Don't expose API errors to client
    return res.json({ suggestion: null, model: 'none' });
  }
});

module.exports = router;
