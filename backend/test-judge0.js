const axios = require('axios');

async function testJudge0() {
  try {
    // Test 1: Check if Judge0 is accessible
    console.log('Testing Judge0 connection...');
    const aboutResponse = await axios.get('http://localhost:2358/about');
    console.log('✅ Judge0 is accessible');
    console.log('Version:', aboutResponse.data.version);
    
    // Test 2: Submit a simple Python code
    console.log('\nSubmitting Python code...');
    const code = 'print("Hello World")';
    const payload = {
      language_id: 71, // Python 3
      source_code: Buffer.from(code).toString('base64'),
      stdin: ''
    };
    
    const submitResponse = await axios.post(
      'http://localhost:2358/submissions?base64_encoded=true&wait=false',
      payload,
      { headers: { 'content-type': 'application/json' } }
    );
    
    const token = submitResponse.data.token;
    console.log('✅ Submission successful, token:', token);
    
    // Test 3: Get result
    console.log('\nWaiting for result...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const resultResponse = await axios.get(
      `http://localhost:2358/submissions/${token}?base64_encoded=true`
    );
    
    const result = resultResponse.data;
    console.log('\n=== RESULT ===');
    console.log('Status:', result.status);
    console.log('Stdout:', result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null);
    console.log('Stderr:', result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null);
    console.log('Compile Output:', result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null);
    console.log('Message:', result.message);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testJudge0();
