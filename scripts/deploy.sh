#!/bin/bash
# NimbusAI Deployment Script
# Automates the complete setup and deployment to a DigitalOcean Droplet

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/myapp"
APP_USER="www-data"
SERVICE_NAME="nimbusai"
REPO_URL="https://github.com/cloudblurr/NimbusAI.git"
NODE_VERSION="20"

echo -e "${YELLOW}=== NimbusAI Deployment Script ===${NC}"

# Step 1: Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js and npm
echo -e "${YELLOW}[2/8] Installing Node.js runtime...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}Node.js already installed: $(node --version)${NC}"
fi

# Step 3: Install git if not present
echo -e "${YELLOW}[3/8] Ensuring git is installed...${NC}"
sudo apt install -y git

# Step 4: Clone or update repository
echo -e "${YELLOW}[4/8] Setting up application repository...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd "$APP_DIR"
    sudo git fetch origin
    sudo git reset --hard origin/main
else
    echo "Cloning repository..."
    sudo mkdir -p "$APP_DIR"
    sudo git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Step 5: Install dependencies
echo -e "${YELLOW}[5/8] Installing npm dependencies...${NC}"
sudo npm install --production

# Step 6: Build the application
echo -e "${YELLOW}[6/8] Building Next.js application...${NC}"
sudo npm run build

# Step 7: Set up environment variables
echo -e "${YELLOW}[7/8] Setting up environment variables...${NC}"
if [ ! -f "$APP_DIR/.env.local" ]; then
    echo -e "${YELLOW}Creating .env.local from .env.example...${NC}"
    sudo cp "$APP_DIR/.env.example" "$APP_DIR/.env.local"
    echo -e "${YELLOW}⚠️  Please edit $APP_DIR/.env.local with your actual values${NC}"
    echo -e "${YELLOW}Required variables:${NC}"
    echo "  - DATABASE_URL"
    echo "  - NEXTAUTH_SECRET"
    echo "  - NEXTAUTH_URL"
    echo "  - DIGITAL_OCEAN_API_TOKEN"
    echo "  - DO_INFERENCE_API_TOKEN"
else
    echo -e "${GREEN}.env.local already exists${NC}"
fi

# Step 8: Set up database
echo -e "${YELLOW}[8/8] Setting up database...${NC}"
cd "$APP_DIR"
sudo npm run setup

# Step 9: Set permissions
echo -e "${YELLOW}Setting file permissions...${NC}"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"
sudo chmod +x "$APP_DIR"

# Step 10: Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=NimbusAI Next.js Application
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
EOF

# Step 11: Enable and start service
echo -e "${YELLOW}Enabling and starting service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

# Step 12: Verify service is running
echo -e "${YELLOW}Verifying service status...${NC}"
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ Service is running${NC}"
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Checking logs:"
    sudo journalctl -u ${SERVICE_NAME} -n 20
    exit 1
fi

# Summary
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}✓ Node.js runtime installed${NC}"
echo -e "${GREEN}✓ Application cloned and built${NC}"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Database configured${NC}"
echo -e "${GREEN}✓ Service running${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit environment variables: sudo nano $APP_DIR/.env.local"
echo "2. Restart service: sudo systemctl restart $SERVICE_NAME"
echo "3. View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "4. Check status: sudo systemctl status $SERVICE_NAME"
echo ""
echo -e "${YELLOW}Application URL: http://$(hostname -I | awk '{print $1}'):3000${NC}"
