# Base stage for both development and production
FROM node:18-alpine AS base
WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Development stage
FROM base AS development
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs prisma ./prisma/
RUN npm install
COPY --chown=nextjs:nodejs . .
RUN npx prisma generate

USER nextjs
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs prisma ./prisma/
RUN npm ci
COPY --chown=nextjs:nodejs . .
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:18-alpine AS production
WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV PORT=3000

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs

EXPOSE 3000

USER nextjs
CMD ["node", "server.js"] 