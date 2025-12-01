// Helper functions to parse user-agent and extract device information

export function parseUserAgent(userAgent) {
    if (!userAgent) {
        return {
            browser: 'Unknown',
            browserVersion: null,
            os: 'Unknown',
            osVersion: null,
            deviceType: 'desktop',
        };
    }

    // Detect browser
    let browser = 'Unknown';
    let browserVersion = null;

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browser = 'Chrome';
        const match = userAgent.match(/Chrome\/([\d.]+)/);
        browserVersion = match ? match[1] : null;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
        const match = userAgent.match(/Version\/([\d.]+)/);
        browserVersion = match ? match[1] : null;
    } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
        const match = userAgent.match(/Firefox\/([\d.]+)/);
        browserVersion = match ? match[1] : null;
    } else if (userAgent.includes('Edg')) {
        browser = 'Edge';
        const match = userAgent.match(/Edg\/([\d.]+)/);
        browserVersion = match ? match[1] : null;
    }

    // Detect OS
    let os = 'Unknown';
    let osVersion = null;

    if (userAgent.includes('Windows NT')) {
        os = 'Windows';
        const match = userAgent.match(/Windows NT ([\d.]+)/);
        osVersion = match ? match[1] : null;
    } else if (userAgent.includes('Mac OS X')) {
        os = 'macOS';
        const match = userAgent.match(/Mac OS X ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : null;
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
        const match = userAgent.match(/Android ([\d.]+)/);
        osVersion = match ? match[1] : null;
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
        const match = userAgent.match(/OS ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : null;
    }

    // Detect device type
    let deviceType = 'desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        deviceType = 'mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
        deviceType = 'tablet';
    }

    return {
        browser,
        browserVersion,
        os,
        osVersion,
        deviceType,
    };
}

export function getDeviceIcon(deviceType) {
    switch (deviceType) {
        case 'mobile':
            return '📱';
        case 'tablet':
            return '📱';
        case 'desktop':
        default:
            return '🖥️';
    }
}

export function getBrowserIcon(browser) {
    switch (browser?.toLowerCase()) {
        case 'chrome':
            return '🌐';
        case 'safari':
            return '🧭';
        case 'firefox':
            return '🦊';
        case 'edge':
            return '🌊';
        default:
            return '🌐';
    }
}

export function getOSIcon(os) {
    switch (os?.toLowerCase()) {
        case 'windows':
            return '🪟';
        case 'macos':
            return '🍎';
        case 'linux':
            return '🐧';
        case 'android':
            return '🤖';
        case 'ios':
            return '📱';
        default:
            return '💻';
    }
}

// Get IP address from request
export function getClientIP(request) {
    // Try various headers that might contain the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    return null;
}

// Generate a unique session token
export function generateSessionToken() {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
