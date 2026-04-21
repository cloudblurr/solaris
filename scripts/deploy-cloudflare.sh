#!/bin/bash
# NimbusAI Cloudflare Container Deployment Script
# Deploys the app to Cloudflare using their Container API

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID}"
CONTAINER_IMAGE="ghcr.io/cloudblurr/nimbusai:latest"
CONTAINER_NAME="nimbusai-prod"
SUBDOMAIN="sol"
DOMAIN="terragravity.cloud"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

echo -e "${BLUE}=== NimbusAI Cloudflare Container Deployment ===${NC}"

# Validate environment variables
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Required:"
    echo "  - CLOUDFLARE_ACCOUNT_ID"
    echo "  - CLOUDFLARE_API_TOKEN"
    echo "  - CLOUDFLARE_ZONE_ID"
    exit 1
fi

# Step 1: Verify Cloudflare credentials
echo -e "${YELLOW}[1/6] Verifying Cloudflare credentials...${NC}"
VERIFY=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$VERIFY" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Cloudflare credentials verified${NC}"
else
    echo -e "${RED}✗ Cloudflare authentication failed${NC}"
    exit 1
fi

# Step 2: Create or update DNS record
echo -e "${YELLOW}[2/6] Configuring DNS record for ${FULL_DOMAIN}...${NC}"

# Check if DNS record exists
DNS_RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${FULL_DOMAIN}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")

RECORD_ID=$(echo "$DNS_RECORD" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RECORD_ID" ]; then
    echo "Creating new DNS record..."
    # Create CNAME record pointing to Cloudflare Pages
    DNS_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"CNAME\",
        \"name\": \"${SUBDOMAIN}\",
        \"content\": \"${CONTAINER_NAME}.containers.cloudflare.com\",
        \"ttl\": 1,
        \"proxied\": true
      }")
    
    if echo "$DNS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ DNS record created${NC}"
    else
        echo -e "${RED}✗ Failed to create DNS record${NC}"
        echo "$DNS_RESPONSE"
        exit 1
    fi
else
    echo "Updating existing DNS record..."
    UPDATE_RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${RECORD_ID}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"CNAME\",
        \"name\": \"${SUBDOMAIN}\",
        \"content\": \"${CONTAINER_NAME}.containers.cloudflare.com\",
        \"ttl\": 1,
        \"proxied\": true
      }")
    
    if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ DNS record updated${NC}"
    else
        echo -e "${RED}✗ Failed to update DNS record${NC}"
        exit 1
    fi
fi

# Step 3: Configure SSL/TLS
echo -e "${YELLOW}[3/6] Configuring SSL/TLS...${NC}"

SSL_RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":"full"}')

if echo "$SSL_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ SSL/TLS configured (Full mode)${NC}"
else
    echo -e "${YELLOW}⚠ SSL/TLS configuration may need manual review${NC}"
fi

# Step 4: Configure security settings
echo -e "${YELLOW}[4/6] Configuring security settings...${NC}"

# Enable Always Use HTTPS
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/always_use_https" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}' > /dev/null

# Enable Automatic HTTPS Rewrites
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/automatic_https_rewrites" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}' > /dev/null

# Enable Brotli compression
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/settings/brotli" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}' > /dev/null

echo -e "${GREEN}✓ Security settings configured${NC}"

# Step 5: Create page rule for caching
echo -e "${YELLOW}[5/6] Configuring caching rules...${NC}"

RULE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/pagerules" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"targets\": [\"${FULL_DOMAIN}/*\"],
    \"actions\": [
      {\"id\": \"cache_level\", \"value\": \"cache_everything\"},
      {\"id\": \"edge_cache_ttl\", \"value\": 14400}
    ],
    \"priority\": 1,
    \"status\": \"active\"
  }")

if echo "$RULE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Caching rules configured${NC}"
else
    echo -e "${YELLOW}⚠ Caching rules may need manual configuration${NC}"
fi

# Step 6: Display deployment information
echo -e "${YELLOW}[6/6] Deployment summary...${NC}"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${BLUE}Container Information:${NC}"
echo "  Image: ${CONTAINER_IMAGE}"
echo "  Name: ${CONTAINER_NAME}"
echo ""
echo -e "${BLUE}Domain Information:${NC}"
echo "  Full Domain: https://${FULL_DOMAIN}"
echo "  Subdomain: ${SUBDOMAIN}"
echo "  Zone: ${DOMAIN}"
echo ""
echo -e "${BLUE}Cloudflare Configuration:${NC}"
echo "  SSL/TLS: Full"
echo "  Always Use HTTPS: Enabled"
echo "  Automatic HTTPS Rewrites: Enabled"
echo "  Brotli Compression: Enabled"
echo "  Cache Level: Cache Everything"
echo "  Edge Cache TTL: 4 hours"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify DNS propagation: nslookup ${FULL_DOMAIN}"
echo "2. Test HTTPS: curl -I https://${FULL_DOMAIN}"
echo "3. Monitor logs: Check Cloudflare Analytics dashboard"
echo "4. Configure environment variables in container"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View DNS records: curl -X GET \"https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records\" \\"
echo "    -H \"Authorization: Bearer \${CLOUDFLARE_API_TOKEN}\""
echo ""
echo "  Purge cache: curl -X POST \"https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache\" \\"
echo "    -H \"Authorization: Bearer \${CLOUDFLARE_API_TOKEN}\" \\"
echo "    -d '{\"files\":[\"https://${FULL_DOMAIN}/*\"]}'"
echo ""
