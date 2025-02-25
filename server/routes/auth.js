const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { AppError, catchAsync } = require('../services/error');
const router = express.Router();

// Register new user
router.post('/register', catchAsync(async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  
  if (existingUser) {
    throw new AppError('Username or email already exists', 400);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 10)
    }
  });

  const token = jwt.sign(
    { userId: user.id, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.status(201).json({ 
    status: 'success',
    data: { token, userId: user.id, username }
  });
}));

// Login user
router.post('/login', catchAsync(async (req, res) => {
  const { username, password } = req.body;
  
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { userId: user.id, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.json({
    status: 'success',
    data: { token, userId: user.id, username }
  });
}));

module.exports = router; 