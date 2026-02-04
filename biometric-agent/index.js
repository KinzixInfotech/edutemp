/**
 * EduBreezy Biometric Agent
 * 
 * A lightweight Node.js service that runs inside the school network,
 * polls Hikvision biometric devices, and pushes events to the cloud ERP.
 * 
 * Usage:
 *   1. Copy config.json.example to config.json and fill in your details
 *   2. npm install
 *   3. npm start (or use PM2: npm run pm2:start)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load configuration
const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, '.agent-state.json');

let config;
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (err) {
    console.error('❌ Failed to load config.json. Copy config.json.example to config.json and fill in your details.');
    process.exit(1);
}

const { schoolId, cloudUrl, agentKey, pollIntervalMs, devices } = config;

// Load or initialize state (last sync times per device)
let state = {};
try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
} catch {
    state = {};
}

function saveState() {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// =============================================================================
// ISAPI Client (for Hikvision devices)
// =============================================================================

class ISAPIClient {
    constructor(device) {
        this.device = device;
        this.baseUrl = `http://${device.ip}:${device.port}`;
        this.username = device.username;
        this.password = device.password;
    }

    /**
     * Check if device is reachable via TCP connection
     */
    async checkConnectivity(timeout = 3000) {
        const net = require('net');
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve({ online: true });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ online: false, reason: 'Connection timeout - device not responding' });
            });

            socket.on('error', (err) => {
                socket.destroy();
                if (err.code === 'ECONNREFUSED') {
                    resolve({ online: false, reason: 'Connection refused - port closed or wrong port' });
                } else if (err.code === 'EHOSTUNREACH') {
                    resolve({ online: false, reason: 'Host unreachable - check network/IP address' });
                } else if (err.code === 'ENETUNREACH') {
                    resolve({ online: false, reason: 'Network unreachable - agent has no network access' });
                } else {
                    resolve({ online: false, reason: err.message });
                }
            });

            socket.connect(this.device.port, this.device.ip);
        });
    }

    /**
     * Get device info/type
     */
    async getDeviceInfo() {
        try {
            const info = await this.request('GET', '/ISAPI/System/deviceInfo', null, 5000);
            return {
                model: info?.DeviceInfo?.model || 'Unknown',
                serialNumber: info?.DeviceInfo?.serialNumber || 'N/A',
                firmwareVersion: info?.DeviceInfo?.firmwareVersion || 'N/A',
                deviceType: info?.DeviceInfo?.deviceType || 'Hikvision'
            };
        } catch {
            return { model: 'Hikvision (info unavailable)', deviceType: 'Hikvision' };
        }
    }

    generateDigestAuth(method, uri, realm, nonce, qop, nc, cnonce) {
        const ha1 = crypto.createHash('md5').update(`${this.username}:${realm}:${this.password}`).digest('hex');
        const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
        const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
        return `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
    }

    parseDigestChallenge(header) {
        const parts = {};
        const regex = /(\w+)="?([^",]+)"?/g;
        let match;
        while ((match = regex.exec(header)) !== null) {
            parts[match[1]] = match[2];
        }
        return parts;
    }

    async request(method, endpoint, body = null, timeout = 15000) {
        const uri = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${uri}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // First request to get Digest challenge
            const initialRes = await fetch(url, {
                method,
                signal: controller.signal,
                headers: body ? { 'Content-Type': 'application/json' } : {}
            });

            if (initialRes.ok) {
                clearTimeout(timeoutId);
                const contentType = initialRes.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    return await initialRes.json();
                }
                return await initialRes.text();
            }

            if (initialRes.status !== 401) {
                clearTimeout(timeoutId);
                throw new Error(`HTTP ${initialRes.status}`);
            }

            // Parse digest challenge
            const authHeader = initialRes.headers.get('www-authenticate');
            if (!authHeader?.toLowerCase().includes('digest')) {
                clearTimeout(timeoutId);
                throw new Error('No Digest auth support');
            }

            const challenge = this.parseDigestChallenge(authHeader);
            const nc = '00000001';
            const cnonce = crypto.randomBytes(8).toString('hex');
            const digestHeader = this.generateDigestAuth(
                method, uri, challenge.realm, challenge.nonce,
                challenge.qop || 'auth', nc, cnonce
            );

            // Authenticated request
            const authRes = await fetch(url, {
                method,
                signal: controller.signal,
                headers: {
                    'Authorization': digestHeader,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                },
                body: body ? JSON.stringify(body) : undefined
            });

            clearTimeout(timeoutId);

            if (authRes.status === 401) {
                throw new Error('Authentication failed - check username/password');
            }

            if (!authRes.ok) {
                throw new Error(`HTTP ${authRes.status}`);
            }

            const contentType = authRes.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await authRes.json();
            }
            return await authRes.text();

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - device took too long to respond');
            }
            throw error;
        }
    }

    async getEvents(sinceTime, maxResults = 500) {
        const formatIST = (date) => {
            const pad = (n) => n.toString().padStart(2, '0');
            const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
            return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())}T${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}+05:30`;
        };

        const startTimeStr = formatIST(sinceTime);
        const endTimeStr = formatIST(new Date());

        console.log(`    📅 Time range: ${startTimeStr} to ${endTimeStr}`);

        const allEvents = [];
        let searchPosition = 0;
        const pageSize = 100;
        let hasMore = true;
        const searchID = crypto.randomBytes(4).toString('hex');

        while (hasMore && allEvents.length < maxResults) {
            const searchCond = {
                AcsEventCond: {
                    searchID,
                    searchResultPosition: searchPosition,
                    maxResults: Math.min(pageSize, maxResults - allEvents.length),
                    major: 0,
                    minor: 0,
                    startTime: startTimeStr,
                    endTime: endTimeStr
                }
            };

            const result = await this.request('POST', '/ISAPI/AccessControl/AcsEvent?format=json', searchCond);

            if (!result.AcsEvent?.InfoList || result.AcsEvent.InfoList.length === 0) {
                hasMore = false;
                break;
            }

            const pageEvents = result.AcsEvent.InfoList.map(event => ({
                rawEventId: event.serialNo?.toString() || crypto.randomBytes(8).toString('hex'),
                eventType: this.parseEventType(event.major, event.minor),
                deviceUserId: event.employeeNoString || event.employeeNo?.toString(),
                eventTime: new Date(event.time),
                cardNo: event.cardNo,
                name: event.name
            }));

            allEvents.push(...pageEvents);
            searchPosition += pageEvents.length;
            hasMore = result.AcsEvent.responseStatusStrg === 'MORE';
        }

        return allEvents;
    }

    parseEventType(major, minor) {
        if (major === 5) {
            if ([75, 76, 77, 78, 79].includes(minor)) return 'CHECK_IN';
            if ([80, 81, 82, 83, 84].includes(minor)) return 'CHECK_OUT';
        }
        return 'CHECK_IN';
    }
}

// =============================================================================
// Cloud API Client
// =============================================================================

async function pushEventsToCloud(deviceId, events) {
    const url = `${cloudUrl}/api/schools/${schoolId}/biometric/ingest`;

    console.log(`    ☁️  Pushing ${events.length} events to cloud...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Agent-Key': agentKey
        },
        body: JSON.stringify({
            deviceId,
            events: events.map(e => ({
                deviceUserId: e.deviceUserId,
                eventType: e.eventType,
                eventTime: e.eventTime.toISOString(),
                cardNo: e.cardNo,
                rawEventId: e.rawEventId
            })),
            agentVersion: '1.0.0'
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cloud API error: ${response.status} - ${text}`);
    }

    return await response.json();
}

// =============================================================================
// Main Polling Loop
// =============================================================================

async function pollDevice(device) {
    const client = new ISAPIClient(device);

    console.log(`\n┌─────────────────────────────────────────────────────`);
    console.log(`│ 📟 Device: ${device.name}`);
    console.log(`│ 🌐 Address: ${device.ip}:${device.port}`);
    console.log(`└─────────────────────────────────────────────────────`);

    // Step 1: Check connectivity
    console.log(`  🔍 Checking connectivity...`);
    const connectivity = await client.checkConnectivity();

    if (!connectivity.online) {
        console.log(`  ❌ OFFLINE: ${connectivity.reason}`);
        state[device.id] = {
            ...state[device.id],
            lastStatus: 'offline',
            lastError: connectivity.reason,
            lastCheck: new Date().toISOString()
        };
        saveState();
        return { success: false, status: 'offline', error: connectivity.reason };
    }

    console.log(`  ✅ Device is ONLINE`);

    // Step 2: Get device info (optional, for display)
    try {
        const info = await client.getDeviceInfo();
        console.log(`  📱 Model: ${info.model}`);
    } catch {
        // Ignore - device info is optional
    }

    // Step 3: Get last sync time
    let sinceTime = state[device.id]?.lastSyncTime
        ? new Date(state[device.id].lastSyncTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Step 4: Fetch events
    console.log(`  🔄 Fetching access events...`);

    try {
        const events = await client.getEvents(sinceTime);

        if (events.length === 0) {
            console.log(`  ✓ No new events since last sync`);
            state[device.id] = {
                lastSyncTime: new Date().toISOString(),
                lastStatus: 'success',
                lastCheck: new Date().toISOString()
            };
            saveState();
            return { success: true, status: 'online', events: 0 };
        }

        console.log(`  📥 Found ${events.length} events`);

        // Filter out events without user ID
        const validEvents = events.filter(e => e.deviceUserId);
        const skippedEvents = events.length - validEvents.length;

        if (skippedEvents > 0) {
            console.log(`  ⚠️  Skipped ${skippedEvents} events (no user ID)`);
        }

        if (validEvents.length > 0) {
            const result = await pushEventsToCloud(device.id, validEvents);
            console.log(`  ✅ Synced: ${result.stats.newEvents} new, ${result.stats.duplicates} duplicates`);
        }

        state[device.id] = {
            lastSyncTime: new Date().toISOString(),
            lastStatus: 'success',
            lastCheck: new Date().toISOString()
        };
        saveState();

        return { success: true, status: 'online', events: validEvents.length };

    } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        state[device.id] = {
            ...state[device.id],
            lastStatus: 'error',
            lastError: error.message,
            lastCheck: new Date().toISOString()
        };
        saveState();
        return { success: false, status: 'error', error: error.message };
    }
}

async function pollAllDevices() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🕐 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`${'═'.repeat(60)}`);

    const results = { online: 0, offline: 0, errors: 0 };

    for (const device of devices) {
        const result = await pollDevice(device);
        if (result.status === 'online') results.online++;
        else if (result.status === 'offline') results.offline++;
        else results.errors++;
    }

    console.log(`\n📊 Summary: ${results.online} online, ${results.offline} offline, ${results.errors} errors`);
}

// =============================================================================
// Entry Point
// =============================================================================

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           EduBreezy Biometric Agent v1.0.0                   ║
╠══════════════════════════════════════════════════════════════╣
║  School ID:  ${schoolId.substring(0, 36)}         ║
║  Cloud URL:  ${cloudUrl.padEnd(43)}║
║  Devices:    ${devices.length.toString().padEnd(43)}║
║  Interval:   ${(pollIntervalMs / 1000) + ' seconds'.padEnd(43)}║
╚══════════════════════════════════════════════════════════════╝
`);

// List devices
console.log('📟 Configured Devices:');
devices.forEach((d, i) => {
    console.log(`   ${i + 1}. ${d.name} @ ${d.ip}:${d.port}`);
});

// Initial poll
pollAllDevices();

// Schedule recurring polls
setInterval(pollAllDevices, pollIntervalMs);

console.log(`\n⏱️  Agent running. Polling every ${pollIntervalMs / 1000}s. Press Ctrl+C to stop.\n`);
