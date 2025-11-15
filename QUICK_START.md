# 🚀 Quick Start Guide - Docker Deployment

## For Developers (First Time Setup)

### 1. Prerequisites
```bash
# Install Docker Desktop (Windows/Mac) or Docker Engine (Linux)
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone and Setup
```bash
# Clone repository
git clone <your-repo-url>
cd event

# Copy environment file
cp .env.example .env

# Edit .env with your values
# Minimum required:
# - DB_PASSWORD=your_password
# - JWT_SECRET=your_secret_32_chars
# - REDIS_PASSWORD=your_redis_pass
# - EMAIL_USER=your_email@gmail.com
# - EMAIL_PASSWORD=your_gmail_app_password
```

### 3. Start Everything
```bash
# Build and start all services
docker-compose up -d

# Wait 30 seconds for services to initialize

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 4. Access Application
```
Frontend: http://localhost
Backend API: http://localhost:5000
Health Check: http://localhost/api/health
```

### 5. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## For Production Deployment

### Option 1: Single Server (Recommended for < 10,000 users)

```bash
# On your server (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Clone repo
git clone <your-repo-url>
cd event

# Configure production environment
cp .env.example .env
nano .env  # Edit all values

# Start services
docker-compose up -d

# Setup SSL (recommended)
# Use Certbot or your preferred method
```

### Option 2: Cloud Deployment (AWS, GCP, Azure)

#### AWS ECS/Fargate:
```bash
# Use docker-compose.yml as base
# Convert to ECS task definition
# Deploy via AWS Console or CLI
```

#### Google Cloud Run:
```bash
# Build images
docker-compose build

# Tag and push to GCR
docker tag event_backend gcr.io/[PROJECT-ID]/backend
docker push gcr.io/[PROJECT-ID]/backend

# Deploy
gcloud run deploy backend --image gcr.io/[PROJECT-ID]/backend
```

#### Azure Container Instances:
```bash
# Similar to GCP, push to ACR
# Deploy via Azure Portal or CLI
```

### Option 3: Kubernetes (For > 20,000 users)

```bash
# Convert docker-compose to k8s
kompose convert

# Or use provided Helm charts (if available)
helm install event-management ./charts

# Scale as needed
kubectl scale deployment backend --replicas=5
```

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Database Operations
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres event_management > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres event_management < backup.sql

# Access database
docker-compose exec postgres psql -U postgres -d event_management
```

### Redis Operations
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Check cache keys
docker-compose exec redis redis-cli KEYS "*"

# Clear all cache
docker-compose exec redis redis-cli FLUSHALL
```

### Restart Services
```bash
# Restart single service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend
```

### Scale Services
```bash
# Run 3 backend instances
docker-compose up -d --scale backend=3

# Check instances
docker-compose ps backend
```

## Troubleshooting

### Containers Won't Start
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Remove old containers/images
docker system prune -a
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Out of Memory
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory
```

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :80    # Windows
lsof -i :80                   # Mac/Linux

# Change ports in docker-compose.yml
# Example: "8080:80" instead of "80:80"
```

## Performance Tuning

### For Development
```bash
# Use docker-compose.dev.yml
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### For Production
```bash
# Enable all optimizations
# Set in .env:
NODE_ENV=production
DB_POOL_MAX=100
RATE_LIMIT_MAX_REQUESTS=1000
```

### Scale Based on Load
```
< 1,000 users:  1 backend instance, shared DB
1K-10K users:   2-3 backend instances
10K-50K users:  5-10 backend instances
50K+ users:     10+ instances, dedicated DB, CDN
```

## Security Checklist

Before going live:
- [ ] All .env values configured
- [ ] JWT_SECRET is random 32+ characters
- [ ] Strong database password
- [ ] HTTPS/SSL configured
- [ ] Firewall rules set
- [ ] Backups scheduled
- [ ] Monitoring enabled
- [ ] Rate limits configured
- [ ] CORS origins set correctly

## Monitoring

### Health Checks
```bash
# Full health
curl http://localhost/api/health | jq

# Quick check
curl http://localhost/api/health/live
```

### Logs
```bash
# Backend logs (inside container)
docker-compose exec backend cat logs/combined-$(date +%Y-%m-%d).log

# Error logs only
docker-compose exec backend cat logs/error-$(date +%Y-%m-%d).log
```

### Metrics
```bash
# Container stats
docker stats

# Queue stats (add this endpoint)
curl http://localhost/api/admin/queue/stats
```

## Backup & Recovery

### Manual Backup
```bash
# Create backup
docker-compose exec backend node -e "require('./src/services/backupService').createBackup().then(console.log)"

# List backups
docker-compose exec backend ls -lh /app/backups
```

### Automated Backups
Set in `.env`:
```env
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

### Restore
```bash
# Stop services
docker-compose down

# Restore database
docker-compose up -d postgres
docker-compose exec -T postgres psql -U postgres event_management < backup.sql

# Start all services
docker-compose up -d
```

## Updating

### Update Code
```bash
# Pull latest changes
git pull origin master

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Update Dependencies
```bash
# Update backend packages
docker-compose exec backend npm update

# Rebuild image
docker-compose build backend
docker-compose up -d backend
```

## Getting Help

1. Check logs: `docker-compose logs -f`
2. Check health: `curl http://localhost/api/health`
3. Review documentation:
   - `DOCKER_DEPLOYMENT.md` - Full deployment guide
   - `IMPLEMENTATION_STATUS.md` - Integration guide
   - GitHub issues

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose CLI](https://docs.docker.com/compose/reference/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)
- [Nginx Docker](https://hub.docker.com/_/nginx)

---

**Ready to deploy? Start with Step 1 above!** 🚀
