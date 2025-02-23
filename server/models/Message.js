const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  aiGenerated: {
    type: Boolean,
    default: false
  }
});

// Index for efficient querying of recent messages
messageSchema.index({ timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 