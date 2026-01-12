const mongoose = require('mongoose');

// File sub-schema for storing multiple files per room
const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    required: true
  }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  files: {
    type: [fileSchema],
    default: [{ name: 'main.js', content: '', language: 'javascript' }]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Room expires after 24 hours
  }
});

module.exports = mongoose.model('Room', roomSchema);
