import { getCache, setCache, delCache } from './cache';

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60; // 15 minutes in seconds
const ATTEMPT_WINDOW = 15 * 60; // 15 minutes in seconds

/**
 * Record a failed login attempt for an IP address
 * @param {string} ipAddress - The IP address of the user
 * @param {string} email - The email used for login
 * @param {string} reason - Reason for failure (e.g., 'invalid_credentials', 'email_not_found')
 * @returns {Promise<{blocked: boolean, attemptsRemaining: number}>}
 */
export async function recordFailedAttempt(ipAddress, email, reason = 'invalid_credentials') {
    const key = `login:attempts:${ipAddress}`;

    try {
        // Get current attempts
        const attempts = await getCache(key) || [];
        const now = Date.now();

        // Filter out old attempts (outside the window)
        const recentAttempts = attempts.filter(
            (attempt) => now - attempt.timestamp < ATTEMPT_WINDOW * 1000
        );

        // Add new attempt
        recentAttempts.push({
            email,
            reason,
            timestamp: now,
        });

        // Save updated attempts
        await setCache(key, recentAttempts, { ex: ATTEMPT_WINDOW });

        // Check if should block
        if (recentAttempts.length >= MAX_ATTEMPTS) {
            await blockIP(ipAddress);
            return {
                blocked: true,
                attemptsRemaining: 0,
                blockDuration: BLOCK_DURATION,
            };
        }

        return {
            blocked: false,
            attemptsRemaining: MAX_ATTEMPTS - recentAttempts.length,
        };
    } catch (error) {
        console.error('Error recording failed attempt:', error);
        return { blocked: false, attemptsRemaining: MAX_ATTEMPTS };
    }
}

/**
 * Block an IP address temporarily
 * @param {string} ipAddress - The IP address to block
 */
export async function blockIP(ipAddress) {
    const key = `login:blocked:${ipAddress}`;
    await setCache(key, true, { ex: BLOCK_DURATION });
}

/**
 * Check if an IP address is currently blocked
 * @param {string} ipAddress - The IP address to check
 * @returns {Promise<boolean>}
 */
export async function isIPBlocked(ipAddress) {
    const key = `login:blocked:${ipAddress}`;
    const blocked = await getCache(key);
    return !!blocked;
}

/**
 * Clear failed attempts for an IP address (called after successful login)
 * @param {string} ipAddress - The IP address to clear
 */
export async function clearFailedAttempts(ipAddress) {
    const key = `login:attempts:${ipAddress}`;
    await delCache(key);
}

/**
 * Get the number of remaining attempts for an IP
 * @param {string} ipAddress - The IP address to check
 * @returns {Promise<number>}
 */
export async function getRemainingAttempts(ipAddress) {
    const key = `login:attempts:${ipAddress}`;
    const attempts = await getCache(key) || [];
    const now = Date.now();

    // Filter recent attempts
    const recentAttempts = attempts.filter(
        (attempt) => now - attempt.timestamp < ATTEMPT_WINDOW * 1000
    );

    return Math.max(0, MAX_ATTEMPTS - recentAttempts.length);
}

/**
 * Get time until IP is unblocked (in seconds)
 * @param {string} ipAddress - The IP address to check
 * @returns {Promise<number|null>} Seconds until unblock, or null if not blocked
 */
export async function getTimeUntilUnblock(ipAddress) {
    const key = `login:blocked:${ipAddress}`;
    const ttl = await getCache(key);

    if (!ttl) return null;

    // Redis TTL would need to be implemented in cache.js
    // For now, return the block duration
    return BLOCK_DURATION;
}
