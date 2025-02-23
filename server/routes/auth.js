const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, catchAsync } = require('../services/error');
const router = express.Router();

// Register new user
router.post('/register', catchAsync(async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });
  
  if (existingUser) {
    throw new AppError('Username or email already exists', 400);
  }

  // Create new user
  const user = new User({ username, email, password });
  await user.save();

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.status(201).json({ 
    status: 'success',
    data: {
      token,
      userId: user._id,
      username
    }
  });
}));

// Login user
router.post('/login', catchAsync(async (req, res) => {
  const { username, password } = req.body;
  
  // Find user
  const user = await User.findOne({ username });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.json({
    status: 'success',
    data: {
      token,
      userId: user._id,
      username
    }
  });
}));

module.exports = router; 