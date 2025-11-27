// AI Suggestion Service
let debounceTimer = null;

export const getAISuggestion = async (code, cursorPosition, language) => {
  try {
    const response = await fetch("http://localhost:5000/api/ai/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, cursorPosition, language }),
    });

    const data = await response.json();
    return data.suggestion || null;
  } catch (error) {
    console.error("AI suggestion error:", error);
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
