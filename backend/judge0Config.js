const axios = require("axios");

/**
 * Judge0 Language ID Mapping
 * Reference: https://ce.judge0.com/languages
 */
const JUDGE0_LANGUAGE_IDS = {
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  python: 71,      // Python (3.8.1)
  java: 62,        // Java (OpenJDK 13.0.1)
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  ruby: 72,        // Ruby (2.7.0)
  php: 68,         // PHP (7.4.1)
  go: 60,          // Go (1.13.5)
  rust: 73,        // Rust (1.40.0)
};

/**
 * Get Judge0 language ID from language name
 */
function getLanguageId(language) {
  return JUDGE0_LANGUAGE_IDS[language] || JUDGE0_LANGUAGE_IDS.javascript;
}

/**
 * Submit code to Judge0 API
 */
async function submitCode(code, languageId, stdin = "") {
  const apiUrl = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST;

  // Build headers based on whether using RapidAPI or self-hosted
  const headers = {
    "content-type": "application/json",
  };

  // Only add RapidAPI headers if API key and host are provided
  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }

  const payload = {
    language_id: languageId,
    source_code: Buffer.from(code).toString("base64"),
    stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
  };

  try {
    const response = await axios.post(
      `${apiUrl}/submissions?base64_encoded=true&wait=false`,
      payload,
      { headers }
    );

    return response.data.token;
  } catch (error) {
    console.error("Judge0 submission error:", error.response?.data || error.message);
    throw new Error("Failed to submit code to Judge0");
  }
}

/**
 * Get submission result from Judge0 API
 */
async function getSubmissionResult(token) {
  const apiUrl = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST;

  // Build headers based on whether using RapidAPI or self-hosted
  const headers = {};

  // Only add RapidAPI headers if API key and host are provided
  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  }

  try {
    const response = await axios.get(
      `${apiUrl}/submissions/${token}?base64_encoded=true`,
      { headers }
    );

    const result = response.data;

    // Decode base64 outputs
    return {
      status: result.status,
      stdout: result.stdout ? Buffer.from(result.stdout, "base64").toString() : null,
      stderr: result.stderr ? Buffer.from(result.stderr, "base64").toString() : null,
      compile_output: result.compile_output ? Buffer.from(result.compile_output, "base64").toString() : null,
      message: result.message,
      time: result.time,
      memory: result.memory,
    };
  } catch (error) {
    console.error("Judge0 result fetch error:", error.response?.data || error.message);
    throw new Error("Failed to fetch result from Judge0");
  }
}

/**
 * Poll for submission result with timeout
 */
async function pollSubmissionResult(token, maxAttempts = 20, interval = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getSubmissionResult(token);

    // Status IDs: 1 = In Queue, 2 = Processing
    if (result.status.id > 2) {
      return result;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error("Code execution timeout");
}

/**
 * Detect basic language mismatch
 * This is a simple heuristic check, not foolproof
 */
function detectLanguageMismatch(code, language) {
  const checks = {
    python: {
      patterns: [/\bdef\s+\w+\s*\(/, /\bprint\s*\(/, /\bif\s+__name__\s*==\s*['"]__main__['"]/],
      name: "Python",
    },
    java: {
      patterns: [/\bpublic\s+class\s+\w+/, /\bpublic\s+static\s+void\s+main/, /System\.out\.println/],
      name: "Java",
    },
    cpp: {
      patterns: [/#include\s*<iostream>/, /std::cout/, /int\s+main\s*\(/],
      name: "C++",
    },
    c: {
      patterns: [/#include\s*<stdio\.h>/, /printf\s*\(/, /int\s+main\s*\(/],
      name: "C",
    },
    javascript: {
      patterns: [/console\.log/, /function\s+\w+/, /const\s+\w+\s*=/, /let\s+\w+\s*=/],
      name: "JavaScript",
    },
  };

  // Check if code contains patterns from other languages
  for (const [lang, { patterns, name }] of Object.entries(checks)) {
    if (lang !== language) {
      for (const pattern of patterns) {
        if (pattern.test(code)) {
          return {
            mismatch: true,
            detectedLanguage: name,
            selectedLanguage: language,
          };
        }
      }
    }
  }

  return { mismatch: false };
}

module.exports = {
  JUDGE0_LANGUAGE_IDS,
  getLanguageId,
  submitCode,
  getSubmissionResult,
  pollSubmissionResult,
  detectLanguageMismatch,
};
