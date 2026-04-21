# NimbusAI Container Deployment - Quick Start

Complete one-command deployment to Cloudflare with sol.terragravity.cloud subdomain.

## Prerequisites

- GitHub account with repository access
- Cloudflare account with domain (terragravity.cloud)
- Cloudflare API token with DNS permissions

## Step 1: Get Cloudflare Credentials (2 minutes)

### 1.1 Account ID
```bash
# Go to: https://dash.cloudflare.com/
# Look at right sidebar → Account ID
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
```

### 1.2 API Token
```bash
# Go to: https://dash.cloudflare.com/profile/api-tokens
# Click "Create Token" → Use "Edit zone DNS" template
# Select zone: terragravity.cloud
# Copy token
export CLOUDFLARE_API_TOKEN="your_api_token"
```

### 1.3 Zone ID
```bash
# Go to: https://dash.cloudflare.com/
# Select terragravity.cloud domain
# Right sidebar → Zone ID
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

## Step 2: Deploy to Cloudflare (5 minutes)

```bash
# Clone repository
git clone https://github.com/cloudblurr/NimbusAI.git
cd NimbusAI

# Set environment variables
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"

# Run deployment script
chmod +x scripts/deploy-cloudflare.sh
./scripts/deploy-cloudflare.sh
```

## Step 3: Verify Deployment (2 minutes)

```bash
# Check DNS propagation
nslookup sol.terragravity.cloud

# Test HTTPS connection
curl -I https://sol.terragravity.cloud

# Should return 200 OK with Cloudflare headers
```

## Step 4: Configure Application (5 minutes)

The container needs environment variables. Set them through Cloudflare:

```bash
# Required environment variables:
DATABASE_URL=postgresql://user:password@host:5432/nimbusai
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://sol.terragravity.cloud
DIGITAL_OCEAN_API_TOKEN=your_token
DO_INFERENCE_API_TOKEN=your_token
```

## What Gets Deployed

✓ **Container Image**: `ghcr.io/cloudblurr/nimbusai:latest`  
✓ **Domain**: `https://sol.terragravity.cloud`  
✓ **DNS**: CNAME record (proxied through Cloudflare)  
✓ **SSL/TLS**: Full mode with automatic HTTPS  
✓ **Caching**: 4-hour edge cache TTL  
✓ **Compression**: Brotli enabled  
✓ **Security**: DDoS protection, WAF available  

## Automatic Updates

Every push to main branch automatically:
1. Builds new container image
2. Pushes to GitHub Container Registry
3. Cloudflare pulls latest image
4. Container restarts with new code

## Monitoring

### Check Status
```bash
curl -I https://sol.terragravity.cloud
```

### View Logs
```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod/logs" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### Purge Cache
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -d '{"purge_everything":true}'
```

## Troubleshooting

### DNS Not Resolving
```bash
# Verify DNS record exists
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### HTTPS Certificate Issues
```bash
# Check certificate
openssl s_client -connect sol.terragravity.cloud:443

# Verify SSL/TLS mode is "Full"
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

### Container Not Responding
```bash
# Check container status
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/containers/nimbusai-prod" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

## Local Testing (Optional)

```bash
# Test container locally before deploying
docker-compose -f docker-compose.prod.yml up -d

# Access at http://localhost:3000
# Stop with: docker-compose -f docker-compose.prod.yml down
```

## Files Reference

- **Dockerfile** - Production container image
- **docker-compose.prod.yml** - Local testing
- **scripts/deploy-cloudflare.sh** - Deployment automation
- **CLOUDFLARE_DEPLOYMENT.md** - Detailed guide
- **CONTAINER_DEPLOYMENT.md** - Architecture guide

## Success Indicators

After deployment, you should see:

✓ DNS resolves: `nslookup sol.terragravity.cloud`  
✓ HTTPS works: `curl -I https://sol.terragravity.cloud`  
✓ Returns 200: HTTP status code 200  
✓ Cloudflare headers: `cf-ray`, `cf-cache-status`  

## Next Steps

1. ✓ Get Cloudflare credentials
2. ✓ Run deployment script
3. ✓ Verify DNS and HTTPS
4. ✓ Configure environment variables
5. ✓ Monitor application

## Support

- **Full Documentation**: [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)
- **Container Guide**: [CONTAINER_DEPLOYMENT.md](./CONTAINER_DEPLOYMENT.md)
- **GitHub Issues**: https://github.com/cloudblurr/NimbusAI/issues

---

**Deployment Time**: ~15 minutes  
**Status**: Production Ready  
**Last Updated**: April 21, 2026
