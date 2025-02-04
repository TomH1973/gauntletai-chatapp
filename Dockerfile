# Base stage
FROM node:18-alpine AS base

# Create app directory
WORKDIR /app

# Create nextjs user and group
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Install OpenSSL
RUN apk add --no-cache openssl

# Development stage
FROM base AS development

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and global tools
RUN npm install && \
    npm install -g ts-node typescript

# Copy source files
COPY . .

# Create directories and set permissions
RUN mkdir -p node_modules/.prisma \
    && mkdir -p .next \
    && chown -R nextjs:nodejs /app \
    && chmod -R 755 /app \
    && chmod -R 777 .next

# Switch to nextjs user
USER nextjs

# Start development server
CMD npx prisma generate && npm run dev

# Production stage
FROM base AS production

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm install --only=production

# Copy source files
COPY . .

# Create directories and set permissions
RUN mkdir -p node_modules/.prisma \
    && mkdir -p .next \
    && chown -R nextjs:nodejs /app \
    && chmod -R 755 /app \
    && chmod -R 777 .next

# Switch to nextjs user
USER nextjs

# Start production server
CMD npx prisma generate && npm start 