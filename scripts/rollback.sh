#!/bin/bash
# NimbusAI Rollback Script
# Rolls back to the previous commit in case of deployment issues

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/myapp"
SERVICE_NAME="nimbusai"

echo -e "${YELLOW}=== NimbusAI Rollback Script ===${NC}"
echo -e "${RED}⚠️  This will rollback to the previous commit${NC}"
echo ""

# Show current and previous commits
echo -e "${YELLOW}Current commits:${NC}"
cd "$APP_DIR"
git log --oneline -5

echo ""
read -p "Continue with rollback? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

# Step 1: Stop service
echo -e "${YELLOW}[1/5] Stopping service...${NC}"
sudo systemctl stop ${SERVICE_NAME}

# Step 2: Rollback to previous commit
echo -e "${YELLOW}[2/5] Rolling back to previous commit...${NC}"
cd "$APP_DIR"
sudo git reset --hard HEAD~1

# Step 3: Install dependencies
echo -e "${YELLOW}[3/5] Installing dependencies...${NC}"
sudo npm install --production

# Step 4: Build application
echo -e "${YELLOW}[4/5] Building application...${NC}"
sudo npm run build

# Step 5: Start service
echo -e "${YELLOW}[5/5] Starting service...${NC}"
sudo systemctl start ${SERVICE_NAME}

# Verify
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ Rollback complete and service is running${NC}"
    echo ""
    echo -e "${YELLOW}Current commit:${NC}"
    git log --oneline -1
else
    echo -e "${RED}✗ Service failed to start after rollback${NC}"
    echo "Checking logs:"
    sudo journalctl -u ${SERVICE_NAME} -n 20
    exit 1
fi
