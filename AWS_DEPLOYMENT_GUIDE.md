# AWS Deployment Guide - Event Management System

## Overview
This guide covers deploying the Event Management System to AWS using:
- **Frontend**: AWS Amplify / S3 + CloudFront
- **Backend**: AWS Elastic Beanstalk / EC2
- **Database**: AWS RDS PostgreSQL
- **Cache**: AWS ElastiCache Redis
- **Storage**: AWS S3 for file uploads
- **Email**: AWS SES or configured SMTP

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** and npm
4. **PostgreSQL client** (psql) for database setup
5. **Git** for version control

---

## Part 1: Database Setup (RDS PostgreSQL)

### Step 1: Create RDS PostgreSQL Instance

```bash
# Via AWS Console
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "Standard Create"
4. Engine: PostgreSQL 15.x or later
5. Templates: Free tier (for testing) or Production
6. DB Instance Identifier: event-management-db
7. Master username: postgres
8. Master password: [Choose strong password]
9. DB instance class: db.t3.micro (Free tier) or db.t3.small
10. Storage: 20 GB (expandable)
11. VPC: Default or custom
12. Public access: Yes (for initial setup, restrict later)
13. VPC security group: Create new (event-management-sg)
14. Database name: event_management
15. Click "Create database"
```

### Step 2: Configure Security Group

```bash
# Add inbound rule for PostgreSQL
- Type: PostgreSQL
- Protocol: TCP
- Port: 5432
- Source: Your IP (for setup) / Application security group (for production)
```

### Step 3: Run Database Schema

```bash
# Get RDS endpoint from AWS Console
# Format: event-management-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com

# Connect to RDS
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d event_management

# Or run schema directly
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d event_management -f database/schema.sql

# Optional: Run seed data
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d event_management -f database/seed.sql
```

---

## Part 2: Redis Setup (ElastiCache)

### Option A: AWS ElastiCache Redis

```bash
# Via AWS Console
1. Go to ElastiCache Console
2. Click "Create" → "Redis"
3. Cluster mode: Disabled
4. Name: event-management-redis
5. Engine version: 7.x
6. Node type: cache.t3.micro (Free tier eligible)
7. Number of replicas: 0 (for testing) or 1+ (for production)
8. VPC: Same as RDS
9. Security group: event-management-sg
10. Create
```

### Option B: Upstash Redis (Serverless)

Already configured - use existing Upstash Redis URL from .env

---

## Part 3: Backend Deployment

### Option A: AWS Elastic Beanstalk (Recommended)

#### Step 1: Install EB CLI

```bash
pip install awsebcli
```

#### Step 2: Initialize Elastic Beanstalk

```bash
cd backend
eb init

# Configuration:
# - Select region (e.g., us-east-1)
# - Application name: event-management-backend
# - Platform: Node.js
# - Platform version: Node.js 18 running on 64bit Amazon Linux 2
# - CodeCommit: No
# - SSH: Yes (for debugging)
```

#### Step 3: Create Environment

```bash
eb create event-management-prod

# Or with options:
eb create event-management-prod \
  --instance-type t3.small \
  --platform "Node.js 18 running on 64bit Amazon Linux 2" \
  --envvars DATABASE_URL=postgresql://user:pass@host:5432/dbname,REDIS_URL=redis://...,NODE_ENV=production
```

#### Step 4: Set Environment Variables

```bash
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/event_management \
  REDIS_URL=your-redis-url \
  JWT_SECRET=your-jwt-secret \
  JWT_REFRESH_SECRET=your-refresh-secret \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_USER=your-email@gmail.com \
  EMAIL_PASS=your-app-password \
  FRONTEND_URL=https://your-frontend-domain.com \
  AWS_REGION=us-east-1 \
  AWS_ACCESS_KEY_ID=your-access-key \
  AWS_SECRET_ACCESS_KEY=your-secret-key \
  S3_BUCKET_NAME=event-management-uploads
```

#### Step 5: Deploy

```bash
eb deploy
```

#### Step 6: Monitor

```bash
# Check status
eb status

# View logs
eb logs

# Open in browser
eb open
```

### Option B: AWS EC2 (Manual Setup)

#### Step 1: Launch EC2 Instance

```bash
# Via AWS Console
1. Launch instance
2. AMI: Amazon Linux 2023
3. Instance type: t3.small or t3.medium
4. Key pair: Create new or use existing
5. Security group: Allow HTTP (80), HTTPS (443), SSH (22), Custom (5000)
6. Storage: 20 GB
7. Launch
```

#### Step 2: Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PostgreSQL client
sudo yum install -y postgresql15

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-repo/event-management.git
cd event-management/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add all environment variables

# Start with PM2
pm2 start src/server.js --name event-backend
pm2 save
pm2 startup
```

#### Step 3: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo yum install -y nginx

# Configure
sudo nano /etc/nginx/conf.d/event-management.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Part 4: Frontend Deployment

### Option A: AWS Amplify (Recommended)

```bash
# Via AWS Console
1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Choose GitHub / GitLab
4. Authorize and select repository
5. Branch: master
6. Build settings: Auto-detected (Vite)
7. Environment variables:
   - VITE_API_URL=https://your-backend-url.com/api
8. Save and deploy
```

#### Amplify Build Settings (if auto-detect fails)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### Option B: S3 + CloudFront

#### Step 1: Build Frontend

```bash
cd frontend
npm run build
```

#### Step 2: Create S3 Bucket

```bash
# Via AWS Console
1. Go to S3 Console
2. Create bucket: event-management-frontend
3. Region: us-east-1
4. Uncheck "Block all public access"
5. Create bucket
```

#### Step 3: Upload Build Files

```bash
# Upload dist folder
aws s3 sync dist/ s3://event-management-frontend --delete

# Set bucket policy for public access
aws s3api put-bucket-policy --bucket event-management-frontend --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::event-management-frontend/*"
    }
  ]
}
```

#### Step 4: Enable Static Website Hosting

```bash
# Via Console
1. Select bucket
2. Properties tab
3. Static website hosting: Enable
4. Index document: index.html
5. Error document: index.html (for SPA routing)
6. Save
```

#### Step 5: Create CloudFront Distribution

```bash
# Via AWS Console
1. Go to CloudFront Console
2. Create distribution
3. Origin domain: event-management-frontend.s3.amazonaws.com
4. Origin access: Public
5. Viewer protocol policy: Redirect HTTP to HTTPS
6. Default root object: index.html
7. Error pages: Add custom error response
   - HTTP error code: 404
   - Response page path: /index.html
   - HTTP response code: 200
8. Create
```

---

## Part 5: S3 for File Uploads

```bash
# Create bucket for uploads
aws s3 mb s3://event-management-uploads

# Set CORS policy
aws s3api put-bucket-cors --bucket event-management-uploads --cors-configuration file://cors.json
```

**cors.json:**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-frontend-domain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

---

## Part 6: Email Setup (AWS SES)

### Step 1: Verify Email Address

```bash
# Via AWS Console
1. Go to SES Console
2. Verified identities → Create identity
3. Identity type: Email address
4. Email: your-email@domain.com
5. Create
6. Check email for verification link
```

### Step 2: Request Production Access

```bash
# SES starts in sandbox mode (can only send to verified emails)
# Request production access:
1. SES Console → Account dashboard
2. "Request production access"
3. Fill form and submit
```

### Step 3: Update Environment Variables

```bash
# For Elastic Beanstalk
eb setenv \
  EMAIL_HOST=email-smtp.us-east-1.amazonaws.com \
  EMAIL_PORT=587 \
  EMAIL_USER=your-ses-smtp-username \
  EMAIL_PASS=your-ses-smtp-password
```

---

## Part 7: Domain and SSL

### Step 1: Register Domain (Route 53)

```bash
# Via AWS Console or your domain registrar
1. Register domain or transfer existing
2. Create hosted zone in Route 53
```

### Step 2: Configure DNS

```bash
# Add A record for backend
- Name: api.yourdomain.com
- Type: A
- Value: Your EC2 IP or Load Balancer DNS

# Add CNAME for frontend
- Name: www.yourdomain.com or @
- Type: A / CNAME
- Value: CloudFront distribution domain
```

### Step 3: SSL Certificate (ACM)

```bash
# Via AWS Console
1. Go to ACM (Certificate Manager)
2. Request certificate
3. Domain names:
   - yourdomain.com
   - *.yourdomain.com
4. Validation: DNS validation
5. Add CNAME records to Route 53 (auto-detected)
6. Wait for validation
7. Attach to CloudFront and Load Balancer
```

---

## Environment Variables Summary

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/event_management

# Redis
REDIS_URL=redis://your-redis-endpoint:6379
# Or Upstash
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-token

# JWT
JWT_SECRET=your-strong-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-username
EMAIL_PASS=your-ses-password
EMAIL_FROM=noreply@yourdomain.com

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=event-management-uploads

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn
```

### Frontend (.env.production)

```bash
VITE_API_URL=https://api.yourdomain.com/api
```

---

## Monitoring and Logs

### CloudWatch Logs

```bash
# Elastic Beanstalk logs automatically go to CloudWatch
# View in AWS Console → CloudWatch → Log groups
```

### PM2 Monitoring (for EC2)

```bash
pm2 monit
pm2 logs
pm2 restart event-backend
```

---

## Cost Estimation (Monthly)

### Free Tier Eligible (First Year)
- **EC2 t3.micro**: Free tier (750 hours/month)
- **RDS db.t3.micro**: Free tier (750 hours/month)
- **S3**: 5 GB storage free
- **CloudFront**: 1 TB transfer free
- **ElastiCache cache.t3.micro**: Free tier

### After Free Tier (Approximate)
- **EC2 t3.small**: ~$15/month
- **RDS db.t3.small**: ~$25/month
- **ElastiCache**: ~$15/month or Upstash free tier
- **S3 + CloudFront**: ~$5-10/month
- **Elastic Beanstalk**: Free (pay only for resources)
- **Route 53**: $0.50/month per hosted zone
- **SES**: $0.10 per 1000 emails

**Total**: ~$60-80/month (after free tier)

---

## Scaling Recommendations

1. **Auto Scaling**: Enable for EC2/Elastic Beanstalk
2. **RDS Read Replicas**: For high read traffic
3. **CloudFront Caching**: Configure proper cache headers
4. **Redis Clustering**: For high cache requirements
5. **Load Balancer**: Add ALB for multiple EC2 instances

---

## Security Checklist

- [ ] Enable HTTPS everywhere (SSL/TLS)
- [ ] Restrict RDS security group to backend only
- [ ] Use IAM roles instead of access keys where possible
- [ ] Enable AWS WAF on CloudFront
- [ ] Set up AWS Secrets Manager for sensitive data
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Configure AWS Backup for RDS
- [ ] Set up CloudWatch alarms
- [ ] Enable MFA on AWS account
- [ ] Regular security audits

---

## Backup Strategy

```bash
# Automated RDS Backups (enabled by default)
# Retention: 7-35 days

# Manual Snapshot
aws rds create-db-snapshot \
  --db-instance-identifier event-management-db \
  --db-snapshot-identifier event-db-snapshot-$(date +%Y%m%d)

# S3 Versioning
aws s3api put-bucket-versioning \
  --bucket event-management-uploads \
  --versioning-configuration Status=Enabled
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
eb logs
# or
pm2 logs event-backend

# Common issues:
# 1. DATABASE_URL incorrect
# 2. Missing environment variables
# 3. Port conflict
# 4. Insufficient memory
```

### Frontend Can't Connect to Backend

```bash
# Check:
# 1. VITE_API_URL is correct
# 2. CORS configured properly
# 3. Backend is running
# 4. Security groups allow traffic
```

### Database Connection Failed

```bash
# Check:
# 1. RDS endpoint correct
# 2. Security group allows connection
# 3. Credentials correct
# 4. Database exists
```

---

## Support

For issues or questions:
- Check AWS documentation
- Review CloudWatch logs
- Contact support@yourdomain.com
