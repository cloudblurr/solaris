#!/bin/bash
# NimbusAI Update Script
# Updates the application to the latest version from main branch

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/myapp"
SERVICE_NAME="nimbusai"

echo -e "${YELLOW}=== NimbusAI Update Script ===${NC}"

# Step 1: Stop the service
echo -e "${YELLOW}[1/6] Stopping service...${NC}"
sudo systemctl stop ${SERVICE_NAME}

# Step 2: Pull latest changes
echo -e "${YELLOW}[2/6] Pulling latest changes from main...${NC}"
cd "$APP_DIR"
sudo git fetch origin
sudo git reset --hard origin/main

# Step 3: Install dependencies
echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
sudo npm install --production

# Step 4: Build application
echo -e "${YELLOW}[4/6] Building application...${NC}"
sudo npm run build

# Step 5: Run migrations
echo -e "${YELLOW}[5/6] Running database migrations...${NC}"
sudo npm run setup

# Step 6: Start service
echo -e "${YELLOW}[6/6] Starting service...${NC}"
sudo systemctl start ${SERVICE_NAME}

# Verify
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ Update complete and service is running${NC}"
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Checking logs:"
    sudo journalctl -u ${SERVICE_NAME} -n 20
    exit 1
fi

echo -e "${GREEN}=== Update Complete ===${NC}"
echo "View logs: sudo journalctl -u ${SERVICE_NAME} -f"
