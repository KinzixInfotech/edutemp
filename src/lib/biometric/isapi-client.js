// lib/biometric/isapi-client.js
// HTTP-based ISAPI client for Hikvision biometric devices

import crypto from 'crypto';

/**
 * ISAPI Client for Hikvision biometric access control devices
 * Uses HTTP Digest Authentication (required by DS-K1 series)
 */
export class ISAPIClient {
    constructor(device) {
        this.device = device;
        this.baseUrl = `${device.connectionType.toLowerCase()}://${device.ipAddress}:${device.port}`;
        this.username = device.username;
        this.password = device.password;
    }

    /**
     * Generate Digest Authentication header
     */
    generateDigestAuth(method, uri, realm, nonce, qop, nc, cnonce) {
        const ha1 = crypto
            .createHash('md5')
            .update(`${this.username}:${realm}:${this.password}`)
            .digest('hex');
        const ha2 = crypto
            .createHash('md5')
            .update(`${method}:${uri}`)
            .digest('hex');
        const response = crypto
            .createHash('md5')
            .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
            .digest('hex');

        return `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
    }

    /**
     * Parse WWW-Authenticate header
     */
    parseDigestChallenge(header) {
        const parts = {};
        const regex = /(\w+)="?([^",]+)"?/g;
        let match;
        while ((match = regex.exec(header)) !== null) {
            parts[match[1]] = match[2];
        }
        return parts;
    }

    /**
     * Make authenticated request with Digest auth
     */
    async request(method, endpoint, body = null, timeout = 15000) {
        const uri = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${uri}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // First request to get the Digest challenge (will return 401)
            const initialRes = await fetch(url, {
                method,
                signal: controller.signal,
                headers: body ? { 'Content-Type': 'application/json' } : {},
            });

            // If we got 200 without auth (unlikely but possible)
            if (initialRes.ok) {
                clearTimeout(timeoutId);
                const contentType = initialRes.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    return await initialRes.json();
                }
                return await initialRes.text();
            }

            // Expect 401 with Digest challenge
            if (initialRes.status !== 401) {
                clearTimeout(timeoutId);
                const errorText = await initialRes.text();
                throw new Error(`HTTP ${initialRes.status}: ${errorText}`);
            }

            // Parse digest challenge
            const authHeader = initialRes.headers.get('www-authenticate');
            if (!authHeader || !authHeader.toLowerCase().includes('digest')) {
                clearTimeout(timeoutId);
                throw new Error('Server does not support Digest authentication');
            }

            const challenge = this.parseDigestChallenge(authHeader);
            const nc = '00000001';
            const cnonce = crypto.randomBytes(8).toString('hex');
            const digestHeader = this.generateDigestAuth(
                method,
                uri,
                challenge.realm,
                challenge.nonce,
                challenge.qop || 'auth',
                nc,
                cnonce
            );

            // Second request with Digest auth
            const authRes = await fetch(url, {
                method,
                signal: controller.signal,
                headers: {
                    Authorization: digestHeader,
                    ...(body && { 'Content-Type': 'application/json' }),
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            clearTimeout(timeoutId);

            if (!authRes.ok) {
                const errorText = await authRes.text();
                throw new Error(`HTTP ${authRes.status}: ${errorText}`);
            }

            const contentType = authRes.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await authRes.json();
            }

            // Try to parse as JSON anyway
            const text = await authRes.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    return JSON.parse(text);
                } catch {
                    return text;
                }
            }
            return text;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Connection timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Test connection to device
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async testConnection() {
        console.log('[ISAPI] Testing connection to:', this.baseUrl);

        try {
            // Use AcsEvent endpoint with required major/minor fields
            const result = await this.request(
                'POST',
                '/ISAPI/AccessControl/AcsEvent?format=json',
                {
                    AcsEventCond: {
                        searchID: '1',
                        searchResultPosition: 0,
                        maxResults: 1,
                        major: 5,
                        minor: 75,
                    },
                },
                10000
            );

            console.log('[ISAPI] Test response:', JSON.stringify(result).substring(0, 200));
            return { success: true };
        } catch (error) {
            console.log('[ISAPI] Test error:', error.message);

            const errorMsg = error.message.toLowerCase();

            // Network-level failures = device unreachable
            const networkErrors = ['econnrefused', 'enotfound', 'enetunreach', 'ehostunreach', 'etimedout'];
            const isNetworkError = networkErrors.some(e => errorMsg.includes(e));

            if (isNetworkError || error.name === 'AbortError') {
                return { success: false, error: error.message };
            }

            // Auth errors
            if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
                return { success: false, error: 'Authentication failed - check username/password' };
            }

            // Connection reset after data = device responded = success
            if (errorMsg.includes('econnreset') || errorMsg.includes('socket hang up')) {
                return { success: true };
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Get user info from device
     */
    async getUserInfo(employeeNo) {
        try {
            const searchCond = {
                UserInfoSearchCond: {
                    searchID: '1',
                    maxResults: 1,
                    searchResultPosition: 0,
                    UserIdentity: {
                        employeeNo: employeeNo,
                    },
                },
            };

            const result = await this.request(
                'POST',
                '/ISAPI/AccessControl/UserInfo/Search?format=json',
                searchCond
            );

            let foundUser = result.UserInfoSearch?.UserInfo?.[0];

            // If the device returned a random user (filter ignored), try to find the correct one in the list
            if (foundUser && foundUser.employeeNo !== employeeNo) {
                // Fetch a batch to find the user
                const batchResult = await this.request(
                    'POST',
                    '/ISAPI/AccessControl/UserInfo/Search?format=json',
                    {
                        UserInfoSearchCond: {
                            searchID: '1',
                            maxResults: 50, // Fetch more to find the user
                            searchResultPosition: 0,
                        },
                    }
                );

                if (batchResult.UserInfoSearch?.UserInfo) {
                    foundUser = batchResult.UserInfoSearch.UserInfo.find(u => u.employeeNo === employeeNo);
                } else {
                    foundUser = null;
                }
            }

            if (!foundUser) {
                return { found: false };
            }

            return {
                found: true,
                user: {
                    employeeNo: foundUser.employeeNo,
                    name: foundUser.name,
                    userType: foundUser.userType,
                    Valid: foundUser.Valid,
                },
                fingerprints: foundUser.numOfFP || 0,
                cards: foundUser.numOfCard || 0,
                faces: foundUser.numOfFace || 0,
            };
        } catch (error) {
            console.error('[ISAPI] getUserInfo error:', error.message);
            throw error;
        }
    }

    /**
     * Create or update user on device
     */
    async createUser(employeeNo, name) {
        try {
            // Check if user already exists
            const existingUser = await this.getUserInfo(employeeNo);

            if (existingUser.found) {
                // Update existing user
                console.log(`[ISAPI] User ${employeeNo} already exists, updating...`);
                await this.request(
                    'PUT',
                    '/ISAPI/AccessControl/UserInfo/Modify?format=json',
                    {
                        UserInfo: {
                            employeeNo: employeeNo,
                            name: name,
                        },
                    }
                );
                return { success: true, action: 'updated' };
            }

            // Create new user with the exact format Hikvision expects
            const userData = {
                UserInfo: {
                    employeeNo: employeeNo,
                    name: name,
                    userType: 'normal',
                    Valid: {
                        enable: true,
                        timeType: 'UTC',
                        beginTime: '2024-01-01T00:00:00+00:00',
                        endTime: '2037-12-31T23:59:59+00:00',
                    },
                    doorRight: '1',
                    RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
                },
            };

            console.log(`[ISAPI] Creating user ${employeeNo} on device...`);
            await this.request(
                'POST',
                '/ISAPI/AccessControl/UserInfo/Record?format=json',
                userData
            );

            return { success: true, action: 'created' };
        } catch (error) {
            console.error('[ISAPI] createUser error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete user from device
     */
    async deleteUser(employeeNo) {
        try {
            await this.request(
                'PUT',
                '/ISAPI/AccessControl/UserInfo/Delete?format=json',
                {
                    UserInfoDelCond: {
                        EmployeeNoList: [{ employeeNo }],
                    },
                }
            );
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Add RFID card to user
     */
    async addCard(employeeNo, cardNo) {
        try {
            const cardData = {
                CardInfo: {
                    employeeNo: employeeNo,
                    cardNo: cardNo,
                    cardType: 'normalCard',
                },
            };

            await this.request(
                'POST',
                '/ISAPI/AccessControl/CardInfo/Record?format=json',
                cardData
            );

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete RFID card from device
     */
    async deleteCard(cardNo) {
        try {
            await this.request(
                'PUT',
                '/ISAPI/AccessControl/CardInfo/Delete?format=json',
                {
                    CardInfoDelCond: {
                        CardNoList: [{ cardNo }],
                    },
                }
            );
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Search all cards on device - used to sync card assignments back to ERP
     */
    async searchCards(maxResults = 30) {
        try {
            const result = await this.request(
                'POST',
                '/ISAPI/AccessControl/CardInfo/Search?format=json',
                {
                    CardInfoSearchCond: {
                        searchID: '1',
                        searchResultPosition: 0,
                        maxResults: 50,
                    },
                }
            );

            if (!result.CardInfoSearch?.CardInfo) {
                return { cards: [], total: 0 };
            }

            let cardList = result.CardInfoSearch.CardInfo;
            if (!Array.isArray(cardList)) {
                cardList = [cardList];
            }

            const cards = cardList.map((card) => ({
                employeeNo: card.employeeNo,
                cardNo: card.cardNo,
                cardType: card.cardType,
            }));

            return {
                cards,
                total: result.CardInfoSearch.totalMatches || cards.length,
            };
        } catch (error) {
            console.error('[ISAPI] searchCards error:', error.message);
            return { cards: [], error: error.message };
        }
    }

    async searchFingerprints(maxResults = 50) {
        console.warn('[ISAPI] searchFingerprints is NOT supported on this device model. Using getUserInfo() instead.');
        return { fingerprints: [], error: 'Operation not supported by device' };
    }

    async assignCard(employeeNo, cardNo) {
        try {
            console.log(`[ISAPI] Assigning card ${cardNo} to user ${employeeNo}`);
            await this.request(
                'POST',
                '/ISAPI/AccessControl/CardInfo/Record?format=json',
                {
                    CardInfo: {
                        employeeNo: employeeNo,
                        cardNo: cardNo,
                        cardType: 'normalCard'
                    }
                }
            );
            return { success: true };
        } catch (error) {
            console.error('[ISAPI] assignCard error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * @param {Date} sinceTime - Fetch events after this time
     * @param {number} maxResults - Maximum results per request (default 100)
     */
    async getAcsEvents(sinceTime, maxResults = 100) {
        try {
            const searchCond = {
                AcsEventCond: {
                    searchID: crypto.randomBytes(4).toString('hex'),
                    searchResultPosition: 0,
                    maxResults: maxResults,
                    major: 5,  // Operation events
                    minor: 75, // Fingerprint verification
                    startTime: sinceTime.toISOString().replace('Z', '+00:00'),
                    endTime: new Date().toISOString().replace('Z', '+00:00'),
                },
            };

            console.log('[ISAPI] Fetching events since:', sinceTime.toISOString());

            const result = await this.request(
                'POST',
                '/ISAPI/AccessControl/AcsEvent?format=json',
                searchCond
            );

            console.log('[ISAPI] Events response:', JSON.stringify(result).substring(0, 300));

            if (!result.AcsEvent?.InfoList) {
                return { events: [], hasMore: false };
            }

            const events = result.AcsEvent.InfoList.map((event) => ({
                rawEventId: event.serialNo?.toString() || crypto.randomBytes(8).toString('hex'),
                eventType: this.parseEventType(event.major, event.minor),
                deviceUserId: event.employeeNoString || event.employeeNo?.toString(),
                eventTime: new Date(event.time),
                cardNo: event.cardNo,
                name: event.name,
                doorName: event.doorName,
                raw: event,
            }));

            const hasMore = result.AcsEvent.numOfMatches > events.length;

            return { events, hasMore };
        } catch (error) {
            console.error('[ISAPI] getAcsEvents error:', error.message);
            throw error;
        }
    }

    /**
     * Get ALL types of access events (fingerprint + card + face)
     */
    async getAllAcsEvents(sinceTime, maxResults = 500) {
        try {
            // Format times in IST for Hikvision device (device is configured for IST)
            // CRITICAL: Node.js Date uses UTC internally, so we need to convert to IST
            const formatIST = (date) => {
                const pad = (n) => n.toString().padStart(2, '0');
                // Convert UTC to IST (add 5 hours 30 minutes)
                const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())}T${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}+05:30`;
            };

            const startTimeStr = formatIST(sinceTime);
            const endTimeStr = formatIST(new Date());

            console.log('[ISAPI] Fetching ALL events from', startTimeStr, 'to', endTimeStr);

            const allEvents = [];
            let searchPosition = 0;
            const pageSize = 100; // Fetch 100 events per page
            let hasMore = true;
            const searchID = crypto.randomBytes(4).toString('hex');

            while (hasMore && allEvents.length < maxResults) {
                const searchCond = {
                    AcsEventCond: {
                        searchID: searchID,
                        searchResultPosition: searchPosition,
                        maxResults: Math.min(pageSize, maxResults - allEvents.length),
                        major: 0,  // All major types
                        minor: 0,  // All minor types
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                    },
                };

                console.log(`[ISAPI] Fetching page at position ${searchPosition}...`);

                const result = await this.request(
                    'POST',
                    '/ISAPI/AccessControl/AcsEvent?format=json',
                    searchCond
                );

                console.log('[ISAPI] Events response status:', result.AcsEvent?.responseStatusStrg,
                    'numOfMatches:', result.AcsEvent?.numOfMatches,
                    'totalMatches:', result.AcsEvent?.totalMatches);

                if (!result.AcsEvent?.InfoList || result.AcsEvent.InfoList.length === 0) {
                    hasMore = false;
                    break;
                }

                const pageEvents = result.AcsEvent.InfoList.map((event) => ({
                    rawEventId: event.serialNo?.toString() || crypto.randomBytes(8).toString('hex'),
                    eventType: this.parseEventType(event.major, event.minor),
                    deviceUserId: event.employeeNoString || event.employeeNo?.toString(),
                    eventTime: new Date(event.time),
                    cardNo: event.cardNo,
                    name: event.name,
                    doorName: event.doorName,
                    raw: event,
                }));

                allEvents.push(...pageEvents);
                searchPosition += pageEvents.length;

                // Check if there are more results
                hasMore = result.AcsEvent.responseStatusStrg === 'MORE';

                console.log(`[ISAPI] Fetched ${pageEvents.length} events, total so far: ${allEvents.length}`);
            }

            console.log(`[ISAPI] Total events fetched: ${allEvents.length}`);
            return { events: allEvents, hasMore: false };
        } catch (error) {
            console.error('[ISAPI] getAllAcsEvents error:', error.message);
            throw error;
        }
    }

    /**
     * Get device system time and format settings
     * @returns {Promise<{success: boolean, deviceTime?: Date, timezone?: string, timeFormat?: string, dateFormat?: string, error?: string}>}
     */
    async getDeviceTime() {
        try {
            const result = await this.request('GET', '/ISAPI/System/time');

            // Parse XML or JSON response
            let deviceTime, timezone, timeFormat, dateFormat;

            if (typeof result === 'string') {
                // XML response - parse manually
                const timeMatch = result.match(/<localTime>([^<]+)<\/localTime>/);
                const tzMatch = result.match(/<timeZone>([^<]+)<\/timeZone>/);
                const tfMatch = result.match(/<timeFormat>([^<]+)<\/timeFormat>/);
                const dfMatch = result.match(/<dateFormat>([^<]+)<\/dateFormat>/);
                if (timeMatch) {
                    deviceTime = new Date(timeMatch[1]);
                }
                timezone = tzMatch ? tzMatch[1] : null;
                timeFormat = tfMatch ? tfMatch[1] : null;
                dateFormat = dfMatch ? dfMatch[1] : null;
            } else if (result.Time) {
                // JSON response
                deviceTime = new Date(result.Time.localTime);
                timezone = result.Time.timeZone;
                timeFormat = result.Time.timeFormat;
                dateFormat = result.Time.dateFormat;
            }

            return {
                success: true,
                deviceTime,
                timezone,
                timeFormat,
                dateFormat,
                raw: result
            };
        } catch (error) {
            console.error('[ISAPI] getDeviceTime error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set device system time to current server time (sync with server)
     * @param {Date} time - Optional time to set, defaults to current server time
     * @param {Object} options - Optional settings for time/date format
     * @param {string} options.timeFormat - '12hour' or '24hour'
     * @param {string} options.dateFormat - 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async setDeviceTime(time = new Date(), options = {}) {
        try {
            // First GET current time to understand the device's format
            const currentTimeXml = await this.request('GET', '/ISAPI/System/time');
            console.log('[ISAPI] Current device time XML:', typeof currentTimeXml === 'string' ? currentTimeXml.substring(0, 800) : JSON.stringify(currentTimeXml));

            // Extract device's timezone from response
            let deviceTimezone = '+05:30'; // Default to IST
            if (typeof currentTimeXml === 'string') {
                const tzMatch = currentTimeXml.match(/<timeZone>([^<]+)<\/timeZone>/);
                if (tzMatch) {
                    console.log('[ISAPI] Device timezone setting:', tzMatch[1]);
                }
                // Also check the localTime format for offset
                const localTimeMatch = currentTimeXml.match(/<localTime>([^<]+)<\/localTime>/);
                if (localTimeMatch) {
                    console.log('[ISAPI] Current device localTime:', localTimeMatch[1]);
                    // Extract timezone offset from existing localTime (e.g., +05:30 or +00:00)
                    const offsetMatch = localTimeMatch[1].match(/([+-]\d{2}:\d{2})$/);
                    if (offsetMatch) {
                        deviceTimezone = offsetMatch[1];
                        console.log('[ISAPI] Extracted timezone offset:', deviceTimezone);
                    }
                }
            }

            // Always use IST timezone (UTC+5:30) for the device
            // This ensures the device shows the correct local time for India
            const IST_TIMEZONE = '+05:30';
            const IST_TZ_STRING = 'CST-5:30:00'; // Hikvision format for IST

            // Use the server's current local time (which is in IST)
            // Format: YYYY-MM-DDTHH:mm:ss+TZ:00
            const pad = (n) => n.toString().padStart(2, '0');
            const localTimeStr = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}T${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}${IST_TIMEZONE}`;

            console.log('[ISAPI] Will set device time to:', localTimeStr);
            console.log('[ISAPI] Will set device timezone to:', IST_TZ_STRING);
            console.log('[ISAPI] Server Date object:', time.toString());

            // If we got XML back, modify it and send it back
            if (typeof currentTimeXml === 'string' && currentTimeXml.includes('<Time')) {
                // Replace localTime value in existing XML
                let updatedXml = currentTimeXml.replace(
                    /<localTime>[^<]*<\/localTime>/,
                    `<localTime>${localTimeStr}</localTime>`
                );
                // Ensure timeMode is manual
                updatedXml = updatedXml.replace(
                    /<timeMode>[^<]*<\/timeMode>/,
                    '<timeMode>manual</timeMode>'
                );
                // Update timezone to IST
                updatedXml = updatedXml.replace(
                    /<timeZone>[^<]*<\/timeZone>/,
                    `<timeZone>${IST_TZ_STRING}</timeZone>`
                );

                // Set time format if specified
                if (options.timeFormat) {
                    if (updatedXml.includes('<timeFormat>')) {
                        updatedXml = updatedXml.replace(
                            /<timeFormat>[^<]*<\/timeFormat>/,
                            `<timeFormat>${options.timeFormat}</timeFormat>`
                        );
                    } else {
                        // Add timeFormat before closing Time tag
                        updatedXml = updatedXml.replace(
                            /<\/Time>/,
                            `<timeFormat>${options.timeFormat}</timeFormat>\n</Time>`
                        );
                    }
                }

                // Set date format if specified
                if (options.dateFormat) {
                    if (updatedXml.includes('<dateFormat>')) {
                        updatedXml = updatedXml.replace(
                            /<dateFormat>[^<]*<\/dateFormat>/,
                            `<dateFormat>${options.dateFormat}</dateFormat>`
                        );
                    } else {
                        // Add dateFormat before closing Time tag
                        updatedXml = updatedXml.replace(
                            /<\/Time>/,
                            `<dateFormat>${options.dateFormat}</dateFormat>\n</Time>`
                        );
                    }
                }

                console.log('[ISAPI] Setting time with XML:', updatedXml.substring(0, 800));
                await this.requestXML('PUT', '/ISAPI/System/time', updatedXml);
                return { success: true, syncedTo: time };
            }

            // Fallback: try minimal XML format
            console.log('[ISAPI] Using minimal XML format...');
            const timeFormatTag = options.timeFormat ? `<timeFormat>${options.timeFormat}</timeFormat>\n` : '';
            const dateFormatTag = options.dateFormat ? `<dateFormat>${options.dateFormat}</dateFormat>\n` : '';
            const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Time version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<timeMode>manual</timeMode>
<localTime>${localTimeStr}</localTime>
<timeZone>CST-5:30:00</timeZone>
${timeFormatTag}${dateFormatTag}</Time>`;

            await this.requestXML('PUT', '/ISAPI/System/time', xmlBody);
            return { success: true, syncedTo: time };
        } catch (error) {
            console.error('[ISAPI] setDeviceTime error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Make XML request (for endpoints that don't support JSON)
     */
    async requestXML(method, endpoint, xmlBody) {
        const uri = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${uri}`;

        // First request to get the Digest challenge
        const initialRes = await fetch(url, { method });

        if (initialRes.status !== 401) {
            const errorText = await initialRes.text();
            throw new Error(`HTTP ${initialRes.status}: ${errorText}`);
        }

        const authHeader = initialRes.headers.get('www-authenticate');
        const challenge = this.parseDigestChallenge(authHeader);
        const nc = '00000001';
        const cnonce = crypto.randomBytes(8).toString('hex');
        const digestHeader = this.generateDigestAuth(
            method, uri, challenge.realm, challenge.nonce,
            challenge.qop || 'auth', nc, cnonce
        );

        const authRes = await fetch(url, {
            method,
            headers: {
                'Authorization': digestHeader,
                'Content-Type': 'application/xml'
            },
            body: xmlBody
        });

        const responseText = await authRes.text();
        console.log(`[ISAPI] XML ${method} response (${authRes.status}):`, responseText.substring(0, 500));

        if (!authRes.ok) {
            throw new Error(`HTTP ${authRes.status}: ${responseText}`);
        }

        return responseText;
    }

    /**
     * Parse Hikvision event type codes
     */
    parseEventType(major, minor) {
        const majorTypes = {
            1: 'alarm',
            2: 'exception',
            5: 'operation',
        };

        const minorTypes = {
            1: 'verifyFingerprint',
            2: 'verifyCard',
            3: 'verifyPassword',
            4: 'verifyFace',
            75: 'verifyFingerprint',
            76: 'verifyCard',
        };

        return minorTypes[minor] || majorTypes[major] || `unknown_${major}_${minor}`;
    }
}

/**
 * Factory function to create ISAPI client
 */
export function createISAPIClient(device) {
    return new ISAPIClient(device);
}

/**
 * Test connection to a device
 */
export async function testDeviceConnection(deviceConfig) {
    const client = new ISAPIClient(deviceConfig);
    return client.testConnection();
}
