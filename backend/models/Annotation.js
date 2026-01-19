const mongoose = require('mongoose');

const AnnotationSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  drawingData: {
    type: Array,
    default: []
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for cleanup query
AnnotationSchema.index({ lastActivity: 1 });

module.exports = mongoose.model('Annotation', AnnotationSchema);
