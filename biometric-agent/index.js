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

        console.log(`  📅 Fetching events from ${startTimeStr} to ${endTimeStr}`);

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

    console.log(`  ☁️  Pushing ${events.length} events to cloud...`);

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

    // Get last sync time (default: 24 hours ago)
    let sinceTime = state[device.id]?.lastSyncTime
        ? new Date(state[device.id].lastSyncTime)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`\n🔄 Polling device: ${device.name} (${device.ip})`);

    try {
        const events = await client.getEvents(sinceTime);

        if (events.length === 0) {
            console.log(`  ✓ No new events`);
            state[device.id] = { lastSyncTime: new Date().toISOString(), lastStatus: 'success' };
            saveState();
            return { success: true, events: 0 };
        }

        console.log(`  📥 Found ${events.length} events`);

        // Filter out events without user ID
        const validEvents = events.filter(e => e.deviceUserId);

        if (validEvents.length > 0) {
            const result = await pushEventsToCloud(device.id, validEvents);
            console.log(`  ✅ Cloud response: ${result.stats.newEvents} new, ${result.stats.duplicates} duplicates`);
        }

        state[device.id] = { lastSyncTime: new Date().toISOString(), lastStatus: 'success' };
        saveState();

        return { success: true, events: validEvents.length };

    } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        state[device.id] = { ...state[device.id], lastStatus: 'error', lastError: error.message };
        saveState();
        return { success: false, error: error.message };
    }
}

async function pollAllDevices() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🕐 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`${'='.repeat(60)}`);

    for (const device of devices) {
        await pollDevice(device);
    }
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

// Initial poll
pollAllDevices();

// Schedule recurring polls
setInterval(pollAllDevices, pollIntervalMs);

console.log(`\n⏱️  Agent running. Polling every ${pollIntervalMs / 1000}s. Press Ctrl+C to stop.\n`);
