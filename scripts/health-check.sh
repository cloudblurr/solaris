#!/bin/bash
# NimbusAI Health Check Script
# Monitors service health and provides diagnostics

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVICE_NAME="nimbusai"
APP_DIR="/var/www/myapp"
APP_PORT="3000"
APP_URL="http://localhost:${APP_PORT}"

echo -e "${BLUE}=== NimbusAI Health Check ===${NC}"
echo ""

# Check 1: Service status
echo -e "${YELLOW}[1] Service Status:${NC}"
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ Service is running${NC}"
    PID=$(sudo systemctl show -p MainPID --value ${SERVICE_NAME})
    echo "  PID: $PID"
else
    echo -e "${RED}✗ Service is not running${NC}"
fi
echo ""

# Check 2: Port listening
echo -e "${YELLOW}[2] Port Listening:${NC}"
if sudo netstat -tlnp 2>/dev/null | grep -q ":${APP_PORT}"; then
    echo -e "${GREEN}✓ Port ${APP_PORT} is listening${NC}"
else
    echo -e "${RED}✗ Port ${APP_PORT} is not listening${NC}"
fi
echo ""

# Check 3: HTTP response
echo -e "${YELLOW}[3] HTTP Response:${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${APP_URL} 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "307" ]; then
    echo -e "${GREEN}✓ HTTP ${RESPONSE} - Application responding${NC}"
else
    echo -e "${RED}✗ HTTP ${RESPONSE} - Application not responding properly${NC}"
fi
echo ""

# Check 4: Disk space
echo -e "${YELLOW}[4] Disk Space:${NC}"
DISK_USAGE=$(df "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ Disk usage: ${DISK_USAGE}%${NC}"
else
    echo -e "${RED}✗ Disk usage: ${DISK_USAGE}% (Warning: >80%)${NC}"
fi
echo ""

# Check 5: Memory usage
echo -e "${YELLOW}[5] Memory Usage:${NC}"
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | awk 'NR==2 {printf("%.1f", $3/$2 * 100)}')
    echo "  Memory: ${MEM_USAGE}%"
fi
echo ""

# Check 6: Recent logs
echo -e "${YELLOW}[6] Recent Logs (last 10 lines):${NC}"
sudo journalctl -u ${SERVICE_NAME} -n 10 --no-pager
echo ""

# Check 7: Environment
echo -e "${YELLOW}[7] Environment Check:${NC}"
if [ -f "$APP_DIR/.env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
    REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" "$APP_DIR/.env.local"; then
            echo "  ✓ $var is set"
        else
            echo -e "  ${RED}✗ $var is missing${NC}"
        fi
    done
else
    echo -e "${RED}✗ .env.local not found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ All systems operational${NC}"
else
    echo -e "${RED}✗ Service is down - restart with: sudo systemctl restart ${SERVICE_NAME}${NC}"
fi
