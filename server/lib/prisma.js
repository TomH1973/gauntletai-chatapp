const { PrismaClient } = require('@prisma/client');

// Single PrismaClient instance to be used across the application
const prisma = new PrismaClient();

module.exports = prisma; 