# NimbusAI Container Deployment Guide

Complete guide for containerizing and deploying NimbusAI using Docker, GitHub Container Registry, and Cloudflare.

## Table of Contents

1. [Container Architecture](#container-architecture)
2. [GitHub Container Registry Setup](#github-container-registry-setup)
3. [Building and Pushing Images](#building-and-pushing-images)
4. [Local Testing](#local-testing)
5. [Cloudflare Deployment](#cloudflare-deployment)
6. [DNS Configuration](#dns-configuration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Container Architecture

### Multi-Stage Build

The Dockerfile uses a 3-stage build process for optimal image size:

1. **deps** - Install production dependencies
2. **builder** - Build the Next.js application
3. **runner** - Minimal runtime image

### Image Specifications

- **Base Image**: `node:20-alpine` (lightweight)
- **Size**: ~300MB (optimized)
- **User**: Non-root user (nextjs:1001)
- **Port**: 3000
- **Health Check**: HTTP endpoint monitoring

## GitHub Container Registry Setup

### 1. Create Personal Access Token

```bash
# Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
# Create token with scopes:
# - write:packages
# - read:packages
# - delete:packages
```

### 2. Authenticate Locally

```bash
# Using GitHub CLI
gh auth login

# Or using Docker
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 3. Verify Authentication

```bash
# Test authentication
docker pull ghcr.io/cloudblurr/nimbusai:latest
```

## Building and Pushing Images

### Automatic Build (GitHub Actions)

The repository includes `.github/workflows/build-and-push.yml` which:

- Triggers on push to main
- Builds multi-platform images
- Pushes to GitHub Container Registry
- Tags with:
  - `latest` (for main branch)
  - `main` (branch name)
  - `sha-<commit>` (commit SHA)
  - Semantic versions (if tagged)

**No manual action needed** - just push to main!

### Manual Build

```bash
# Build the image
docker build -t ghcr.io/cloudblurr/nimbusai:latest .

# Tag with version
docker tag ghcr.io/cloudblurr/nimbusai:latest ghcr.io/cloudblurr/nimbusai:v1.0.0

# Push to registry
docker push ghcr.io/cloudblurr/nimbusai:latest
docker push ghcr.io/cloudblurr/nimbusai:v1.0.0
```

### Build for Multiple Platforms

```bash
# Using buildx for multi-platform builds
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/cloudblurr/nimbusai:latest \
  --push .
```

## Local Testing

### Using Docker Compose

#### Production-like Environment

```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://nimbusai:nimbusai@db:5432/nimbusai
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
DIGITAL_OCEAN_API_TOKEN=your_token
DO_INFERENCE_API_TOKEN=your_token
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### Development Environment

```bash
# Start with development profile
docker-compose up -d --profile dev

# Access development server
# App: http://localhost:3001
# API: http://localhost:3000
```

### Manual Container Testing

```bash
# Build image
docker build -t nimbusai:test .

# Run container
docker run -d \
  --name nimbusai-test \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="test-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  nimbusai:test

# Check logs
docker logs -f nimbusai-test

# Test endpoint
curl http://localhost:3000

# Stop container
docker stop nimbusai-test
docker rm nimbusai-test
```

## Cloudflare Deployment

### Prerequisites

1. Cloudflare account with domain
2. API token with DNS edit permissions
3. Account ID and Zone ID

### Get Credentials

```bash
# Account ID - from Cloudflare Dashboard sidebar
export CLOUDFLARE_ACCOUNT_ID="your_account_id"

# API Token - from My Profile → API Tokens
export CLOUDFLARE_API_TOKEN="your_api_token"

# Zone ID - from domain dashboard sidebar
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

### Deploy to Cloudflare

```bash
# Make script executable
chmod +x scripts/deploy-cloudflare.sh

# Run deployment
./scripts/deploy-cloudflare.sh
```

### What Gets Configured

**DNS:**
- CNAME record: `sol.terragravity.cloud`
- Points to: `nimbusai-prod.containers.cloudflare.com`
- Proxied: Yes (orange cloud)
- TTL: Automatic

**SSL/TLS:**
- Mode: Full
- Always Use HTTPS: Enabled
- Automatic HTTPS Rewrites: Enabled

**Performance:**
- Brotli Compression: Enabled
- Cache Level: Cache Everything
- Edge Cache TTL: 4 hours

**Security:**
- DDoS Protection: Enabled
- Web Application Firewall: Available

## DNS Configuration

### Verify DNS Setup

```bash
# Check DNS propagation
nslookup sol.terragravity.cloud

# Detailed DNS info
dig sol.terragravity.cloud

# Check CNAME target
dig sol.terragravity.cloud CNAME
```

### Manual DNS Configuration

If automatic setup fails:

```bash
# Create DNS record via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "sol",
    "content": "nimbusai-prod.containers.cloudflare.com",
    "ttl": 1,
    "proxied": true
  }'
```

### Update DNS Record

```bash
# Get record ID
RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=sol.terragravity.cloud" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Update record
curl -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "sol",
    "content": "nimbusai-prod.containers.cloudflare.com",
    "ttl": 1,
    "proxied": true
  }'
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check HTTPS connection
curl -I https://sol.terragravity.cloud

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s https://sol.terragravity.cloud

# Check certificate
openssl s_client -connect sol.terragravity.cloud:443
```

### View Container Logs

```bash
# Via Cloudflare API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod/logs" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

# Via Docker (if running locally)
docker logs -f nimbusai-prod
```

### Monitor Performance

1. **Cloudflare Dashboard**:
   - Analytics → Traffic
   - Performance → Page Speed
   - Security → Threats

2. **Key Metrics**:
   - Request count
   - Cache hit ratio
   - Error rate
   - Response time

### Purge Cache

```bash
# Purge all cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

# Purge specific paths
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      "https://sol.terragravity.cloud/api/*",
      "https://sol.terragravity.cloud/page"
    ]
  }'
```

### Update Container Image

```bash
# Push new image to registry
docker push ghcr.io/cloudblurr/nimbusai:latest

# Cloudflare automatically pulls latest image
# Container restarts with new code
```

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS records
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

# Verify nameservers
whois terragravity.cloud | grep "Name Server"
```

### HTTPS Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect sol.terragravity.cloud:443 -showcerts

# Verify SSL/TLS mode
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### Container Not Responding

```bash
# Check container status
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

# Check logs
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod/logs" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### High Error Rate

1. Check container environment variables
2. Verify database connectivity
3. Review Cloudflare security rules
4. Check rate limiting settings

## Quick Reference

```bash
# Build and push image
docker build -t ghcr.io/cloudblurr/nimbusai:latest .
docker push ghcr.io/cloudblurr/nimbusai:latest

# Deploy to Cloudflare
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ZONE_ID="..."
./scripts/deploy-cloudflare.sh

# Verify deployment
curl -I https://sol.terragravity.cloud
nslookup sol.terragravity.cloud

# View logs
docker logs -f nimbusai-prod

# Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -d '{"purge_everything":true}'
```

## Files Reference

- **Dockerfile** - Production multi-stage build
- **Dockerfile.dev** - Development build with hot-reload
- **.dockerignore** - Files to exclude from build
- **docker-compose.prod.yml** - Production services
- **.github/workflows/build-and-push.yml** - CI/CD pipeline
- **scripts/deploy-cloudflare.sh** - Cloudflare deployment automation

---

**Last Updated**: April 21, 2026  
**Status**: Production Ready
