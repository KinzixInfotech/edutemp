// Helper functions to parse user-agent and extract device information

export function parseUserAgent(userAgent) {
    if (!userAgent) {
        return {
            browser: 'Unknown',
            browserVersion: null,
            os: 'Unknown',
            osVersion: null,
            deviceType: 'desktop',
            deviceModel: 'Unknown Device'
        };
    }

    const ua = userAgent;
    let browser = 'Unknown';
    let browserVersion = null;
    let os = 'Unknown';
    let osVersion = null;
    let deviceType = 'desktop';
    let deviceModel = null;

    // --- Browser Detection ---
    if (/Edg\//.test(ua)) {
        browser = 'Edge';
        browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1];
    } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) {
        browser = 'Chrome';
        browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1];
    } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
        browser = 'Safari';
        browserVersion = ua.match(/Version\/([\d.]+)/)?.[1];
    } else if (/Firefox\//.test(ua)) {
        browser = 'Firefox';
        browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1];
    } else if (/OPR\//.test(ua) || /Opera/.test(ua)) {
        browser = 'Opera';
        browserVersion = ua.match(/(?:OPR|Version)\/([\d.]+)/)?.[1];
    } else if (/SamsungBrowser\//.test(ua)) {
        browser = 'Samsung Internet';
        browserVersion = ua.match(/SamsungBrowser\/([\d.]+)/)?.[1];
    } else if (/Trident\//.test(ua)) {
        browser = 'Internet Explorer';
        browserVersion = ua.match(/rv:([\d.]+)/)?.[1];
    }

    // --- OS Detection ---
    if (/Windows/.test(ua)) {
        os = 'Windows';
        const v = ua.match(/Windows NT ([\d.]+)/)?.[1];
        if (v === '10.0') osVersion = '10/11';
        else if (v === '6.3') osVersion = '8.1';
        else if (v === '6.2') osVersion = '8';
        else if (v === '6.1') osVersion = '7';
        else osVersion = v;
    } else if (/Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua)) {
        os = 'macOS';
        osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.');
    } else if (/Android/.test(ua)) {
        os = 'Android';
        osVersion = ua.match(/Android ([\d.]+)/)?.[1];
        deviceType = 'mobile';
        // Try to find model
        const modelMatch = ua.match(/; ([^;]+) Build\//);
        if (modelMatch) deviceModel = modelMatch[1];
    } else if (/iPhone|iPad|iPod/.test(ua)) {
        os = 'iOS';
        osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.');
        deviceType = /iPad/.test(ua) ? 'tablet' : 'mobile';
        if (/iPhone/.test(ua)) deviceModel = 'iPhone';
        else if (/iPad/.test(ua)) deviceModel = 'iPad';
    } else if (/Linux/.test(ua)) {
        os = 'Linux';
    }

    // Refine Device Type
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/.test(ua)) {
        if (!/iPad|Tablet/.test(ua)) deviceType = 'mobile';
    }
    if (/Tablet|iPad|PlayBook/.test(ua)) {
        deviceType = 'tablet';
    }

    // Construct a friendly device name if possible
    if (!deviceModel) {
        if (os === 'macOS') deviceModel = 'Mac';
        else if (os === 'Windows') deviceModel = 'PC';
        else deviceModel = 'Unknown Device';
    }

    return {
        browser,
        browserVersion,
        os,
        osVersion,
        deviceType,
        deviceModel
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
    const b = browser?.toLowerCase();
    if (b?.includes('chrome')) return '🌐';
    if (b?.includes('safari')) return '🧭';
    if (b?.includes('firefox')) return '🦊';
    if (b?.includes('edge')) return '🌊';
    if (b?.includes('opera')) return '🔴';
    return '🌐';
}

export function getOSIcon(os) {
    const o = os?.toLowerCase();
    if (o?.includes('windows')) return '🪟';
    if (o?.includes('mac')) return '🍎';
    if (o?.includes('linux')) return '🐧';
    if (o?.includes('android')) return '🤖';
    if (o?.includes('ios')) return '📱';
    return '💻';
}

// Get IP address from request
export function getClientIP(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) return realIP;
    if (cfConnectingIP) return cfConnectingIP;

    return null;
}

// Generate a unique session token
export function generateSessionToken() {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// INFO: Limited to 45 requests per minute from same IP for ip-api (free plan)
export async function getGeoLocation(ip) {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return 'Localhost';
    }

    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`);
        const data = await res.json();

        if (data.status === 'success') {
            return `${data.city}, ${data.regionName}, ${data.country}`;
        }
    } catch (error) {
        console.warn('Failed to fetch geolocation:', error);
    }
    return 'Unknown Location';
}
