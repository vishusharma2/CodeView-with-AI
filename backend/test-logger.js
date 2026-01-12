/**
 * Test script to verify environment-based logging
 * Run this to see how logs behave in different environments
 */

const logger = require('./logger');

console.log('\n=== LOGGING TEST ===');
console.log('Current NODE_ENV:', process.env.NODE_ENV || 'undefined (development)');
console.log('isDevelopment:', process.env.NODE_ENV !== 'production');
console.log('\n--- Testing logger methods ---\n');

logger.log('✅ This is a logger.log() message');
logger.error('❌ This is a logger.error() message');
logger.warn('⚠️  This is a logger.warn() message');
logger.info('ℹ️  This is a logger.info() message');

console.log('\n=== END TEST ===');
console.log('If you see the emoji messages above, logging is ENABLED (development mode)');
console.log('If you DON\'T see them, logging is DISABLED (production mode)\n');
