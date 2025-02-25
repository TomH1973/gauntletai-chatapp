const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { AppError, catchAsync } = require('../services/error');
const router = express.Router();

router.use(authenticateToken);

// Get last 50 messages
router.get('/', catchAsync(async (req, res) => {
  const messages = await prisma.message.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { username: true }
      }
    }
  });

  res.json({
    status: 'success',
    data: messages.reverse()
  });
}));

// Create new message
router.post('/', catchAsync(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    throw new AppError('Message text is required', 400);
  }

  const message = await prisma.message.create({
    data: {
      text,
      userId: req.user.id,
      isAI: false
    },
    include: {
      user: {
        select: { username: true }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    data: message
  });
}));

module.exports = router; 