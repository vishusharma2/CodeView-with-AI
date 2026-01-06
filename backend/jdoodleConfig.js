const axios = require("axios");

/**
 * JDoodle Language Configuration
 * Maps editor language names to JDoodle language identifiers
 */
const JDOODLE_LANGUAGES = {
  javascript: { language: "nodejs", versionIndex: "4" },
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "4" },
  cpp: { language: "cpp17", versionIndex: "1" },
  c: { language: "c", versionIndex: "5" },
  ruby: { language: "ruby", versionIndex: "4" },
  php: { language: "php", versionIndex: "4" },
  go: { language: "go", versionIndex: "4" },
  rust: { language: "rust", versionIndex: "4" },
};

/**
 * Execute code using JDoodle API
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language
 * @param {string} stdin - Standard input (optional)
 * @returns {Promise<Object>} Execution result
 */
async function executeCode(code, language, stdin = "") {
  const apiUrl = "https://api.jdoodle.com/v1/execute";
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  // Validate credentials
  if (!clientId || !clientSecret) {
    throw new Error(
      "JDoodle API credentials not configured. Please set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in .env file"
    );
  }

  // Get language configuration
  const langConfig = JDOODLE_LANGUAGES[language];
  if (!langConfig) {
    throw new Error(
      `Unsupported language: ${language}. Supported languages: ${Object.keys(
        JDOODLE_LANGUAGES
      ).join(", ")}`
    );
  }

  // Prepare request payload
  const payload = {
    clientId,
    clientSecret,
    script: code,
    language: langConfig.language,
    versionIndex: langConfig.versionIndex,
    stdin: stdin || "",
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error) {
    console.error("JDoodle API error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error("Invalid JDoodle API credentials");
    } else if (error.response?.status === 429) {
      throw new Error("JDoodle API rate limit exceeded. Please try again later.");
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Code execution timeout");
    }
    
    throw new Error(error.response?.data?.error || "Failed to execute code");
  }
}

/**
 * Get list of supported languages
 * @returns {Array<string>} List of supported language names
 */
function getSupportedLanguages() {
  return Object.keys(JDOODLE_LANGUAGES);
}

module.exports = {
  executeCode,
  getSupportedLanguages,
  JDOODLE_LANGUAGES,
};
