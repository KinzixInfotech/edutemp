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
        try {
            const result = await this.request(
                'POST',
                '/ISAPI/AccessControl/FingerPrint/Search?format=json',
                {
                    FingerPrintSearchCond: {
                        searchID: '1',
                        searchResultPosition: 0,
                        maxResults: maxResults,
                    },
                }
            );

            let fpList = result.FingerPrintSearch?.FingerPrint || [];
            if (!Array.isArray(fpList)) {
                fpList = [fpList];
            }

            return {
                fingerprints: fpList.map(fp => ({
                    employeeNo: fp.employeeNo,
                    cardReaderNo: fp.cardReaderNo,
                    fingerPrintID: fp.fingerPrintID
                })),
                total: result.FingerPrintSearch?.totalMatches || 0
            };
        } catch (error) {
            console.error('[ISAPI] searchFingerprints error:', error.message);
            return { fingerprints: [], error: error.message };
        }
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
    async getAllAcsEvents(sinceTime, maxResults = 100) {
        try {
            const searchCond = {
                AcsEventCond: {
                    searchID: crypto.randomBytes(4).toString('hex'),
                    searchResultPosition: 0,
                    maxResults: maxResults,
                    major: 0,  // All major types
                    minor: 0,  // All minor types
                    startTime: sinceTime.toISOString().replace('Z', '+00:00'),
                    endTime: new Date().toISOString().replace('Z', '+00:00'),
                },
            };

            console.log('[ISAPI] Fetching ALL events since:', sinceTime.toISOString());

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
            console.error('[ISAPI] getAllAcsEvents error:', error.message);
            throw error;
        }
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
