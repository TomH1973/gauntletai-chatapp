const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { createHash } = require('crypto');

const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Token blacklist for revoked tokens
const tokenBlacklist = new Set();

/**
 * Generate a session token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      sessionId: createHash('sha256')
        .update(Date.now().toString())
        .digest('hex')
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
function verifyToken(token) {
  if (tokenBlacklist.has(token)) {
    throw new Error('Token has been revoked');
  }
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Authenticate a user
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Authenticated user object
 * @throws {Error} If authentication fails
 */
async function authenticateUser(token) {
  try {
    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        roles: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Check if user has required permissions
 * @param {Object} user - User object
 * @param {string[]} requiredPermissions - Required permissions
 * @returns {boolean} True if user has all required permissions
 */
function checkPermissions(user, requiredPermissions) {
  if (!user || !user.roles) return false;
  return requiredPermissions.every(permission =>
    user.roles.some(role => role.permissions.includes(permission))
  );
}

/**
 * Revoke a token
 * @param {string} token - Token to revoke
 */
function revokeToken(token) {
  tokenBlacklist.add(token);
}

// Clean up expired tokens from blacklist periodically
setInterval(() => {
  for (const token of tokenBlacklist) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Token is expired, remove from blacklist
      if (error.name === 'TokenExpiredError') {
        tokenBlacklist.delete(token);
      }
    }
  }
}, 3600000); // Run every hour

module.exports = {
  authenticateUser,
  generateToken,
  verifyToken,
  revokeToken,
  checkPermissions
}; 