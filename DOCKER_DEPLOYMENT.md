# Event Management System - Docker Deployment Guide

## 🚀 Production-Ready Deployment with Docker

This guide covers deploying the Event Management System using Docker with all production improvements including Redis caching, Bull queues, Sentry error tracking, comprehensive security, and monitoring.

## 📋 Prerequisites

- Docker (v20.10 or higher)
- Docker Compose (v2.0 or higher)
- Git
- At least 4GB RAM available
- 20GB disk space

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Nginx (LB)    │  ← HTTPS/Load Balancer
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼──┐
│Frontend│  │Backend│  ← React + Node.js/Express
└───┬───┘  └──┬───┘
    │         │
    │    ┌────┴────┐
    │    │         │
    │  ┌─▼──┐  ┌──▼──┐
    │  │Redis│  │Postgres│  ← Cache + Database
    │  └────┘  └─────┘
    │
┌───▼──────────┐
│  Bull Queue   │  ← Background Jobs
└──────────────┘
```

## 🔧 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd event
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database
DB_PASSWORD=your_strong_password_here

# Redis
REDIS_PASSWORD=your_redis_password_here

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Sentry (optional but recommended)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
```

### 3. Build and Start Services

```bash
# Build all containers
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Health check
curl http://localhost/api/health

# Check frontend
curl http://localhost/
```

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React application (Nginx) |
| Backend | 5000 | Node.js API server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & Queue store |
| Nginx | 443, 8080 | Load balancer (optional) |

## 🔐 Security Features

### Implemented Security Measures

✅ **Helmet** - Security headers
✅ **CSRF Protection** - Cross-site request forgery prevention
✅ **Rate Limiting** - Per IP and per user limits
✅ **Input Validation** - Joi schema validation
✅ **SQL Injection Prevention** - Parameterized queries
✅ **XSS Protection** - Input sanitization
✅ **HTTPS Enforcement** - Redirect HTTP to HTTPS
✅ **Password Hashing** - BCrypt with 10 rounds
✅ **JWT Authentication** - Secure token-based auth

### Rate Limits

- **Global**: 100 requests per 15 minutes per IP
- **Students**: 100 requests per 15 minutes
- **Volunteers**: 500 requests per 15 minutes
- **Admins**: 1000 requests per 15 minutes
- **Auth Endpoints**: 5 attempts per 15 minutes

## 📊 Monitoring & Logging

### Log Files

Logs are stored in `backend/logs/`:

- `error-YYYY-MM-DD.log` - Error logs only
- `combined-YYYY-MM-DD.log` - All logs
- `http-YYYY-MM-DD.log` - HTTP request logs

Logs are rotated daily and compressed after 14 days.

### Health Endpoints

- `GET /api/health` - Full health check with all services
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

### Sentry Integration

Error tracking and performance monitoring via Sentry:

```javascript
// Automatic error capture
// Performance transaction tracking
// Release tracking
// User feedback collection
```

## 🚀 Performance Optimizations

### Redis Caching

**Cached Data:**
- Events list (5 minutes TTL)
- Individual events (1 hour TTL)
- Stalls list (5 minutes TTL)
- User data (2 hours TTL)
- QR tokens (5 minutes TTL)
- Session data (24 hours TTL)

### Bull Queue

**Background Jobs:**
- Email sending (3 retries with exponential backoff)
- Bulk email operations
- QR code generation
- Report generation

**Queue Statistics:**
```bash
# View queue stats
curl http://localhost:5000/api/admin/queue/stats
```

### Database Connection Pooling

```javascript
pool: {
  max: 100,      // Maximum connections
  min: 10,       // Minimum connections
  acquire: 60000,// Max time to acquire (60s)
  idle: 10000    // Max idle time (10s)
}
```

## 🔄 Database Migrations

### Run Migrations

```bash
# Inside backend container
docker-compose exec backend node src/scripts/updateUserFields.js
docker-compose exec backend node src/scripts/addStallParticipants.js
docker-compose exec backend node src/scripts/addStallEmailDepartment.js
```

### Backup Database

```bash
# Manual backup
docker-compose exec postgres pg_dump -U postgres event_management > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres event_management < backup.sql
```

### Automated Backups

Backups run automatically at 2 AM daily (configured in cron job).

## 📈 Scaling

### Scale Backend Services

```bash
# Run 3 backend instances
docker-compose up -d --scale backend=3

# Nginx will automatically load balance
```

### Production Environment

For production, use:

```bash
# With Nginx load balancer
docker-compose --profile production up -d

# Or use external load balancer (AWS ALB, etc.)
```

## 🐛 Troubleshooting

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose exec postgres pg_isready -U postgres

# Check database exists
docker-compose exec postgres psql -U postgres -c "\l"

# Connect to database
docker-compose exec postgres psql -U postgres -d event_management
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis memory usage
docker-compose exec redis redis-cli info memory
```

### Container Not Starting

```bash
# View container status
docker-compose ps

# View detailed logs
docker-compose logs backend

# Rebuild specific service
docker-compose build --no-cache backend
docker-compose up -d backend
```

## 🔧 Development Mode

```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# The backend will use nodemon for auto-restart
# Frontend will use Vite dev server
```

## 📝 Environment Variables

### Critical Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `securePass123!` |
| `JWT_SECRET` | JWT signing key | `min-32-chars-secret` |
| `REDIS_PASSWORD` | Redis password | `redisPass123!` |
| `EMAIL_PASSWORD` | Gmail app password | `abcd efgh ijkl mnop` |
| `SENTRY_DSN` | Sentry project DSN | `https://...@sentry.io/123` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (ms) |
| `DB_POOL_MAX` | 100 | Max DB connections |
| `LOG_LEVEL` | info | Logging level |

## 🧪 Testing

### Run Tests in Container

```bash
# Unit tests
docker-compose exec backend npm test

# Integration tests
docker-compose exec backend npm run test:integration

# Coverage report
docker-compose exec backend npm test -- --coverage
```

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker-compose build
          docker-compose push
      
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

## 📊 Performance Benchmarks

### Expected Performance

- **API Response Time**: < 200ms (with cache)
- **QR Generation**: < 100ms
- **Email Queue**: 1000+ emails/minute
- **Concurrent Users**: 20,000+
- **Database Queries**: < 50ms (cached < 5ms)

### Load Testing

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test API endpoint
ab -n 10000 -c 100 http://localhost/api/events

# Test with authentication
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" http://localhost/api/events
```

## 🔒 Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set up Sentry for error tracking
- [ ] Enable automated backups
- [ ] Configure firewall rules
- [ ] Review CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring alerts
- [ ] Review database connection limits
- [ ] Enable audit logging
- [ ] Configure session timeouts
- [ ] Test disaster recovery plan

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Sentry Documentation](https://docs.sentry.io/)

## 🆘 Support

For issues and questions:

1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check GitHub issues
4. Contact: your-email@example.com

## 📄 License

MIT License - See LICENSE file for details
