# Deployment Guide

This guide outlines the steps required to deploy the chat application in various environments.

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis 6.x or higher
- AWS Account with S3 and CloudFront access
- Clerk account for authentication
- Domain name with SSL certificate

### Environment Variables
```env
# App
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket
AWS_CLOUDFRONT_DOMAIN=your_distribution_domain

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

# Security
CORS_ORIGINS=https://your-domain.com
```

## Development Environment

1. Clone the repository:
```bash
git clone https://github.com/your-repo/chat-app.git
cd chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up local environment:
```bash
cp .env.example .env.local
# Edit .env.local with your development credentials
```

4. Start development servers:
```bash
npm run dev
```

## Staging Environment

1. Configure staging environment:
```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Set up staging environment variables
cp .env.example .env.staging
# Edit .env.staging with staging credentials
```

2. Deploy to staging:
```bash
# Build application
npm run build

# Start application
npm run start
```

## Production Environment

### Infrastructure Setup

1. **Database Setup**
   - Create PostgreSQL instance
   - Configure high availability
   - Set up automated backups
   - Configure connection pooling

2. **Redis Setup**
   - Deploy Redis cluster
   - Enable persistence
   - Configure maxmemory policy
   - Set up monitoring

3. **AWS Configuration**
   - Create S3 bucket
   - Configure CORS
   - Set up CloudFront distribution
   - Configure SSL certificate

4. **Domain & SSL**
   - Configure DNS records
   - Set up SSL certificates
   - Configure NGINX reverse proxy

### Deployment Steps

1. **Prepare Production Build**
```bash
# Install production dependencies
npm ci --production

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy
```

2. **Configure NGINX**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

3. **Start Production Server**
```bash
# Using PM2 for process management
pm2 start npm --name "chat-app" -- start
```

### Monitoring & Maintenance

1. **Health Checks**
   - Configure endpoint monitoring
   - Set up error alerting
   - Monitor system resources

2. **Backup Strategy**
   - Daily database backups
   - S3 bucket versioning
   - Configuration backups

3. **Scaling Configuration**
   - Configure auto-scaling rules
   - Set up load balancing
   - Monitor performance metrics

4. **Security Measures**
   - Regular security audits
   - SSL certificate renewal
   - Dependency updates
   - Access control review

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        if: success()
        run: |
          if [ $GITHUB_REF == "refs/heads/main" ]; then
            # Deploy to production
            npm run deploy:prod
          else
            # Deploy to staging
            npm run deploy:staging
          fi
```

## Rollback Procedures

1. **Database Rollback**
```bash
# Revert last migration
npx prisma migrate reset
```

2. **Application Rollback**
```bash
# Switch to previous version
git checkout <previous-tag>

# Rebuild and restart
npm ci
npm run build
pm2 restart chat-app
```

3. **Infrastructure Rollback**
   - Restore database backup
   - Revert CDN configuration
   - Reset environment variables

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check connection string
   - Verify network access
   - Check SSL certificates

2. **WebSocket Connection Failures**
   - Verify NGINX configuration
   - Check firewall rules
   - Confirm client settings

3. **File Upload Issues**
   - Verify S3 permissions
   - Check CloudFront settings
   - Confirm file size limits

### Performance Optimization

1. **Database Optimization**
   - Index frequently queried fields
   - Optimize slow queries
   - Configure connection pooling

2. **Caching Strategy**
   - Configure Redis caching
   - Set up CDN caching rules
   - Implement browser caching

3. **Resource Management**
   - Configure memory limits
   - Set up log rotation
   - Monitor disk usage
``` 