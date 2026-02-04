# EduBreezy Biometric Agent

A lightweight Node.js service that runs inside the school network, polls Hikvision biometric devices, and pushes attendance events to the EduBreezy cloud.

## Why This Approach?

- **Security**: Biometric device stays on local network (no port forwarding)
- **Reliability**: Agent runs 24/7, auto-syncs every 2 minutes
- **Real-time**: Attendance events pushed to cloud within minutes

## Requirements

- **Node.js 16+** on any computer in the school network
- **Network access** to biometric device (same LAN)
- **Outbound HTTPS** access to edubreezy.com

---

## Quick Setup

### Step 1: Get Your Agent Key

From EduBreezy admin, generate an agent key:
```bash
POST /api/schools/YOUR_SCHOOL_ID/biometric/agent-key
```

### Step 2: Configure

```bash
cp config.json.example config.json
```

Edit `config.json`:
```json
{
  "schoolId": "your-school-uuid",
  "cloudUrl": "https://www.edubreezy.com",
  "agentKey": "ebz_agent_xxxxx",
  "pollIntervalMs": 120000,
  "devices": [{
    "id": "device-uuid",
    "name": "Main Gate",
    "ip": "192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "xxxxx"
  }]
}
```

### Step 3: Install

#### Windows
```batch
install-windows.bat
```
Choose option:
1. **Task Scheduler** (recommended) - Runs at startup
2. **NSSM Service** (advanced) - Full Windows Service

#### Linux
```bash
sudo ./install-linux.sh
```
Choose option:
1. **systemd** (recommended) - Native Linux service
2. **PM2** - Process manager

---

## Manual Running

```bash
npm install
npm start
```

---

## Service Management

### Windows (Task Scheduler)
```batch
:: Start/Stop
schtasks /run /tn "EduBreezy Biometric Agent"
schtasks /end /tn "EduBreezy Biometric Agent"

:: Remove
schtasks /delete /tn "EduBreezy Biometric Agent" /f
```

### Windows (NSSM)
```batch
nssm status "EduBreezy Biometric Agent"
nssm restart "EduBreezy Biometric Agent"
nssm stop "EduBreezy Biometric Agent"
nssm remove "EduBreezy Biometric Agent" confirm
```

### Linux (systemd)
```bash
sudo systemctl status edubreezy-biometric
sudo systemctl restart edubreezy-biometric
sudo systemctl stop edubreezy-biometric
sudo journalctl -u edubreezy-biometric -f  # View logs
```

### Linux (PM2)
```bash
pm2 status
pm2 logs edubreezy-biometric
pm2 restart edubreezy-biometric
pm2 stop edubreezy-biometric
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to device | Check IP, ping device, verify credentials |
| Events not in cloud | Verify agentKey, check cloud logs |
| Agent crashes | Check config.json is valid JSON, Node.js 16+ |
| No network | Agent retries automatically |

---

## Architecture

```
School LAN                        Cloud
┌────────────┐    outbound      ┌─────────────┐
│ Biometric  │◄──►│ Agent │────HTTPS───►│ /ingest API │
│ Device     │    │ (24/7)│             │   ↓         │
└────────────┘    └───────┘             │ Attendance  │
192.168.x.x                             └─────────────┘
```

**Security Notes:**
- Agent key is per-school (keep secret)
- Agent makes **outbound** HTTPS only
- Device credentials stay local (never sent to cloud)
