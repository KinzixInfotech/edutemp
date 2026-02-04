#!/bin/bash
# EduBreezy Biometric Agent - Linux Setup Script
# Run with sudo for systemd installation

set -e

echo "========================================"
echo " EduBreezy Biometric Agent Setup"
echo " Linux Installation"
echo "========================================"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo "Install with: sudo apt install nodejs npm"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js found: $(node -v)"

# Check for config.json
if [ ! -f "config.json" ]; then
    echo
    echo -e "${YELLOW}[SETUP]${NC} Creating config.json from template..."
    cp config.json.example config.json
    echo
    echo -e "${YELLOW}[ACTION REQUIRED]${NC}"
    echo "Please edit config.json with your settings:"
    echo "  - schoolId"
    echo "  - agentKey"  
    echo "  - device IP, username, password"
    echo
    echo "Opening config.json in editor..."
    ${EDITOR:-nano} config.json
fi

# Install dependencies
echo
echo -e "${GREEN}[INSTALL]${NC} Installing dependencies..."
npm install

# Check if running as root for systemd
if [ "$EUID" -eq 0 ]; then
    INSTALL_SYSTEMD=true
else
    echo
    echo -e "${YELLOW}[NOTE]${NC} Run with 'sudo' to install as systemd service"
    INSTALL_SYSTEMD=false
fi

echo
echo "Choose installation method:"
echo "  1. systemd service (recommended, requires sudo)"
echo "  2. PM2 process manager"
echo "  3. Just run manually"
echo
read -p "Enter choice (1/2/3): " choice

case $choice in
    1)
        if [ "$INSTALL_SYSTEMD" = false ]; then
            echo -e "${RED}[ERROR]${NC} Please run with sudo: sudo ./install-linux.sh"
            exit 1
        fi
        
        echo
        echo -e "${GREEN}[SYSTEMD]${NC} Creating service..."
        
        # Create systemd service file
        cat > /etc/systemd/system/edubreezy-biometric.service << EOF
[Unit]
Description=EduBreezy Biometric Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/node $SCRIPT_DIR/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=edubreezy-biometric

[Install]
WantedBy=multi-user.target
EOF

        # Enable and start service
        systemctl daemon-reload
        systemctl enable edubreezy-biometric
        systemctl start edubreezy-biometric
        
        echo
        echo -e "${GREEN}[SUCCESS]${NC} systemd service installed and started!"
        echo
        echo "Useful commands:"
        echo "  sudo systemctl status edubreezy-biometric   # Check status"
        echo "  sudo journalctl -u edubreezy-biometric -f   # View logs"
        echo "  sudo systemctl restart edubreezy-biometric  # Restart"
        echo "  sudo systemctl stop edubreezy-biometric     # Stop"
        ;;
        
    2)
        echo
        echo -e "${GREEN}[PM2]${NC} Setting up with PM2..."
        
        # Check for PM2
        if ! command -v pm2 &> /dev/null; then
            echo "Installing PM2 globally..."
            npm install -g pm2
        fi
        
        pm2 start index.js --name "edubreezy-biometric"
        pm2 save
        pm2 startup
        
        echo
        echo -e "${GREEN}[SUCCESS]${NC} PM2 service configured!"
        echo
        echo "Useful commands:"
        echo "  pm2 status                     # Check status"
        echo "  pm2 logs edubreezy-biometric   # View logs"
        echo "  pm2 restart edubreezy-biometric # Restart"
        ;;
        
    3)
        echo
        echo -e "${YELLOW}[MANUAL]${NC} To run manually:"
        echo "  node index.js"
        echo
        echo "Press Ctrl+C to stop."
        node index.js
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo
echo "========================================"
echo " Setup complete!"
echo "========================================"
