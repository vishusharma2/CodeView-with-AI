const axios = require("axios");
const logger = require("./logger");

/**
 * Judge0 Language Configuration
 * Maps editor language names to Judge0 language IDs
 * Reference: https://github.com/judge0/judge0/blob/master/docs/api/languages.md
 */
const JUDGE0_LANGUAGES = {
  javascript: { id: 63, name: "JavaScript (Node.js 12.14.0)" },
  python: { id: 71, name: "Python (3.8.1)" },
  java: { id: 62, name: "Java (OpenJDK 13.0.1)" },
  cpp: { id: 54, name: "C++ (GCC 9.2.0)" },
  c: { id: 50, name: "C (GCC 9.2.0)" },
  ruby: { id: 72, name: "Ruby (2.7.0)" },
  php: { id: 68, name: "PHP (7.4.1)" },
  go: { id: 60, name: "Go (1.13.5)" },
  rust: { id: 73, name: "Rust (1.40.0)" },
  typescript: { id: 74, name: "TypeScript (3.7.4)" },
};

/**
 * Execute code using Judge0 API
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language
 * @param {string} stdin - Standard input (optional)
 * @returns {Promise<Object>} Execution result
 */
async function executeCode(code, language, stdin = "") {
  const apiUrl = process.env.JUDGE0_API_URL;

  // Validate API URL
  if (!apiUrl) {
    throw new Error(
      "Judge0 API URL not configured. Please set JUDGE0_API_URL in .env file"
    );
  }

  // Get language configuration
  const langConfig = JUDGE0_LANGUAGES[language];
  if (!langConfig) {
    throw new Error(
      `Unsupported language: ${language}. Supported languages: ${Object.keys(
        JUDGE0_LANGUAGES
      ).join(", ")}`
    );
  }

  // Prepare submission payload
  const payload = {
    source_code: Buffer.from(code).toString("base64"),
    language_id: langConfig.id,
    stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
  };

  try {
    // Submit code for execution (synchronous with wait=true)
    const submitResponse = await axios.post(
      `${apiUrl}/submissions?base64_encoded=true&wait=true`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const result = submitResponse.data;

    // Decode base64 outputs
    const stdout = result.stdout
      ? Buffer.from(result.stdout, "base64").toString("utf-8")
      : null;
    const stderr = result.stderr
      ? Buffer.from(result.stderr, "base64").toString("utf-8")
      : null;
    const compileOutput = result.compile_output
      ? Buffer.from(result.compile_output, "base64").toString("utf-8")
      : null;

    // Format response similar to JDoodle for compatibility
    return {
      output: stdout || compileOutput || stderr || "",
      statusCode: result.status?.id,
      statusDescription: result.status?.description,
      memory: result.memory,
      cpuTime: result.time,
      error: result.status?.id >= 6 ? stderr || compileOutput : null,
    };
  } catch (error) {
    logger.error("Judge0 API error:", error.response?.data || error.message);

    if (error.code === "ECONNREFUSED") {
      throw new Error("Cannot connect to Judge0 server. Is it running?");
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
  return Object.keys(JUDGE0_LANGUAGES);
}

module.exports = {
  executeCode,
  getSupportedLanguages,
  JUDGE0_LANGUAGES,
};
