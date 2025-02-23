const express = require('express');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');
const { AppError, catchAsync } = require('../services/error');
const router = express.Router();

// Get recent messages (last 50)
router.get('/', authenticateToken, catchAsync(async (req, res) => {
  const messages = await Message.find()
    .sort({ timestamp: -1 })
    .limit(50)
    .populate('userId', 'username')
    .lean();

  if (!messages) {
    throw new AppError('Error fetching messages', 500);
  }

  // Reverse to get chronological order
  res.json({
    status: 'success',
    data: messages.reverse()
  });
}));

// Create new message
router.post('/', authenticateToken, catchAsync(async (req, res) => {
  const { text, aiGenerated = false } = req.body;
  
  if (!text || text.trim().length === 0) {
    throw new AppError('Message text is required', 400);
  }

  const userId = req.user.userId;

  const message = new Message({
    text,
    userId,
    aiGenerated
  });

  await message.save();
  
  // Populate username for immediate use
  await message.populate('userId', 'username');
  
  res.status(201).json({
    status: 'success',
    data: message
  });
}));

module.exports = router; 