# NimbusAI Cloudflare Container Deployment Guide

This guide covers deploying NimbusAI as a containerized application on Cloudflare using their Container API.

## Prerequisites

1. **GitHub Account** - For GitHub Container Registry
2. **Cloudflare Account** - With domain management
3. **Docker** - For local testing (optional)
4. **API Tokens** - Cloudflare API token with appropriate permissions

## Step 1: Prepare GitHub Container Registry

### 1.1 Create Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `write:packages` - Push packages
   - `read:packages` - Pull packages
   - `delete:packages` - Delete packages
4. Copy the token and save it securely

### 1.2 Authenticate with GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Or using PAT
docker login ghcr.io
# Username: your_github_username
# Password: your_personal_access_token
```

## Step 2: Build and Push Container Image

### 2.1 Automatic Build (GitHub Actions)

The repository includes `.github/workflows/build-and-push.yml` which automatically:
- Builds the Docker image on every push to main
- Pushes to GitHub Container Registry
- Tags with branch, version, and SHA

**No manual action needed** - just push to main!

### 2.2 Manual Build (if needed)

```bash
# Build the image
docker build -t ghcr.io/cloudblurr/nimbusai:latest .

# Push to GitHub Container Registry
docker push ghcr.io/cloudblurr/nimbusai:latest
```

## Step 3: Set Up Cloudflare

### 3.1 Get Cloudflare API Credentials

1. **Account ID**:
   - Go to Cloudflare Dashboard
   - Right sidebar → Account ID (copy it)

2. **API Token**:
   - Go to My Profile → API Tokens
   - Click "Create Token"
   - Use template: "Edit zone DNS"
   - Select your zone
   - Copy the token

3. **Zone ID**:
   - Go to your domain dashboard
   - Right sidebar → Zone ID (copy it)

### 3.2 Set Environment Variables

```bash
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

Or create a `.env.cloudflare` file:

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ZONE_ID=your_zone_id
```

Then source it:
```bash
source .env.cloudflare
```

## Step 4: Deploy Container

### 4.1 Run Deployment Script

```bash
chmod +x scripts/deploy-cloudflare.sh
./scripts/deploy-cloudflare.sh
```

This script will:
- ✓ Verify Cloudflare credentials
- ✓ Create/update DNS record
- ✓ Configure SSL/TLS
- ✓ Enable security settings
- ✓ Set up caching rules

### 4.2 What Gets Configured

**DNS:**
- CNAME record pointing to Cloudflare container endpoint
- Proxied through Cloudflare (orange cloud)
- TTL: 1 (automatic)

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

## Step 5: Verify Deployment

### 5.1 Check DNS Propagation

```bash
# Check DNS record
nslookup sol.terragravity.cloud

# Or with dig
dig sol.terragravity.cloud

# Or with host
host sol.terragravity.cloud
```

Expected output should show CNAME pointing to Cloudflare container endpoint.

### 5.2 Test HTTPS Connection

```bash
# Test with curl
curl -I https://sol.terragravity.cloud

# Should return 200 OK with Cloudflare headers
```

### 5.3 Check Cloudflare Dashboard

1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to DNS Records
4. Verify the CNAME record for `sol` subdomain
5. Check Analytics for traffic

## Step 6: Configure Container Environment

### 6.1 Set Container Environment Variables

The container needs the same environment variables as the application:

```env
DATABASE_URL=postgresql://user:password@host:5432/nimbusai
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=https://sol.terragravity.cloud
DIGITAL_OCEAN_API_TOKEN=your_token
DO_INFERENCE_API_TOKEN=your_token
```

### 6.2 Update Container Configuration

Through Cloudflare Dashboard or API:

```bash
# Update container with environment variables
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": {
      "DATABASE_URL": "postgresql://...",
      "NEXTAUTH_SECRET": "...",
      "NEXTAUTH_URL": "https://sol.terragravity.cloud",
      "DIGITAL_OCEAN_API_TOKEN": "...",
      "DO_INFERENCE_API_TOKEN": "..."
    }
  }'
```

## Step 7: Monitor and Maintain

### 7.1 View Logs

```bash
# View container logs through Cloudflare API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod/logs" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### 7.2 Monitor Performance

1. **Cloudflare Dashboard**:
   - Analytics → Traffic
   - Performance → Page Speed
   - Security → Threats

2. **Metrics to Watch**:
   - Request count
   - Cache hit ratio
   - Error rate
   - Response time

### 7.3 Purge Cache

```bash
# Purge all cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

# Purge specific files
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

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS propagation
nslookup sol.terragravity.cloud

# If not resolving, verify:
# 1. DNS record exists in Cloudflare
# 2. Zone is active
# 3. Nameservers are correct
```

### HTTPS Certificate Issues

```bash
# Check certificate
openssl s_client -connect sol.terragravity.cloud:443

# If certificate issues:
# 1. Verify SSL/TLS mode is "Full"
# 2. Wait for certificate issuance (usually instant)
# 3. Check Cloudflare SSL/TLS settings
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

1. Check container logs
2. Verify environment variables
3. Check database connectivity
4. Review Cloudflare security rules

## Advanced Configuration

### Custom Page Rules

```bash
# Create page rule for API endpoints
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/pagerules" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["sol.terragravity.cloud/api/*"],
    "actions": [
      {"id": "cache_level", "value": "bypass"}
    ],
    "priority": 1,
    "status": "active"
  }'
```

### WAF Rules

1. Go to Cloudflare Dashboard
2. Security → WAF
3. Create custom rules for your API

### Rate Limiting

```bash
# Create rate limit rule
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rate_limit" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "match": {
      "request": {
        "url": {
          "path": {
            "matches": "/api/*"
          }
        }
      }
    },
    "action": {
      "mode": "challenge",
      "timeout": 86400
    },
    "threshold": 100,
    "period": 60,
    "description": "Rate limit API endpoints"
  }'
```

## Deployment Workflow

### For Updates

1. **Make changes** to code
2. **Push to main** branch
3. **GitHub Actions** automatically builds and pushes image
4. **Cloudflare** pulls latest image
5. **Container restarts** with new code

### For Emergency Rollback

```bash
# Rollback to previous image tag
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "ghcr.io/cloudblurr/nimbusai:previous-tag"
  }'
```

## Security Best Practices

1. **Rotate API Tokens** - Regularly update Cloudflare API tokens
2. **Use Secrets** - Store sensitive data in environment variables
3. **Enable WAF** - Use Cloudflare Web Application Firewall
4. **Monitor Logs** - Regularly review access and error logs
5. **Rate Limiting** - Protect against abuse
6. **DDoS Protection** - Cloudflare provides automatic DDoS protection

## Performance Optimization

1. **Enable Caching** - Already configured
2. **Compression** - Brotli enabled
3. **Minification** - Enable in Cloudflare
4. **Image Optimization** - Enable in Cloudflare
5. **HTTP/2** - Enabled by default
6. **HTTP/3 (QUIC)** - Enable in Cloudflare

## Cost Optimization

- **Free Plan**: Good for development
- **Pro Plan**: Recommended for production
- **Business Plan**: For enterprise features
- **Enterprise Plan**: For custom solutions

## Support Resources

- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Cloudflare Container API](https://developers.cloudflare.com/workers/platform/containers/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Quick Reference

```bash
# Set environment variables
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ZONE_ID="..."

# Deploy
./scripts/deploy-cloudflare.sh

# Verify
curl -I https://sol.terragravity.cloud

# Check DNS
nslookup sol.terragravity.cloud

# Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -d '{"purge_everything":true}'
```

---

**Last Updated**: April 21, 2026  
**Status**: Production Ready
