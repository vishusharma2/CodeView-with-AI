// AI Suggestion Service
import logger from '../utils/logger';

let debounceTimer = null;

export const getAISuggestion = async (code, cursorPosition, language) => {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    logger.log('🤖 Requesting AI suggestion from:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/ai/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, cursorPosition, language }),
    });

    if (!response.ok) {
      logger.error('AI suggestion failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    logger.log('🤖 AI suggestion received:', data.suggestion ? 'Yes' : 'No');
    return data.suggestion || null;
  } catch (error) {
    logger.error("AI suggestion error:", error);
    return null;
  }
};

export const debouncedGetAISuggestion = (code, cursorPosition, language, callback) => {
  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer
  debounceTimer = setTimeout(async () => {
    const suggestion = await getAISuggestion(code, cursorPosition, language);
    callback(suggestion);
  }, 500); // 500ms debounce
};

export const cancelPendingSuggestion = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
