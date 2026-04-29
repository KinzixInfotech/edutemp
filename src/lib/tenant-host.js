const ROOT_DOMAIN = 'edubreezy.com';
const TENANT_PARENT_DOMAIN = `erp.${ROOT_DOMAIN}`;
const TENANT_LOCAL_SUFFIX = '.erp.localhost';
const RESERVED_SUBDOMAINS = new Set(['www', 'atlas', 'pay', 'teacher']);
const INTERNAL_HOST_SUFFIXES = ['.vercel.app', '.vercel.dev'];

export function normalizeHost(host = '') {
    return String(host).trim().toLowerCase().replace(/:\d+$/, '');
}

export function getSubdomainLabel(host = '') {
    const normalizedHost = normalizeHost(host);

    if (normalizedHost.endsWith(`.${TENANT_PARENT_DOMAIN}`)) {
        return normalizedHost.slice(0, -(`.${TENANT_PARENT_DOMAIN}`.length));
    }

    if (normalizedHost.endsWith(TENANT_LOCAL_SUFFIX)) {
        return normalizedHost.slice(0, -(TENANT_LOCAL_SUFFIX.length));
    }

    return '';
}

export function isReservedSubdomainLabel(label = '') {
    return RESERVED_SUBDOMAINS.has(String(label).toLowerCase());
}

export function isPlatformHost(host = '') {
    const normalizedHost = normalizeHost(host);

    if (!normalizedHost) {
        return false;
    }

    if (
        normalizedHost === ROOT_DOMAIN ||
        normalizedHost === `www.${ROOT_DOMAIN}` ||
        normalizedHost === TENANT_PARENT_DOMAIN
    ) {
        return true;
    }

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return true;
    }

    if (normalizedHost === 'erp.localhost') {
        return true;
    }

    return INTERNAL_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix));
}

export function isSchoolTenantHost(host = '') {
    const normalizedHost = normalizeHost(host);
    const label = getSubdomainLabel(normalizedHost);

    if (label) {
        return !isReservedSubdomainLabel(label);
    }

    if (isPlatformHost(normalizedHost)) {
        return false;
    }

    if (!normalizedHost.includes('.')) {
        return false;
    }

    return true;
}

export function getTenantDomainCandidates(host = '') {
    const normalizedHost = normalizeHost(host);

    if (!normalizedHost) {
        return [];
    }

    const candidates = new Set([normalizedHost]);
    const label = getSubdomainLabel(normalizedHost);

    if (label && !isReservedSubdomainLabel(label)) {
        candidates.add(`${label}.${ROOT_DOMAIN}`);
    }

    if (normalizedHost.endsWith(TENANT_LOCAL_SUFFIX) && label && !isReservedSubdomainLabel(label)) {
        candidates.add(`${label}.${TENANT_PARENT_DOMAIN}`);
    }

    return [...candidates];
}

export function getCanonicalOriginForHost(host = '') {
    const normalizedHost = normalizeHost(host);

    if (!normalizedHost) {
        return 'https://www.edubreezy.com';
    }

    if (normalizedHost.endsWith('.localhost')) {
        return `http://${normalizedHost}:3000`;
    }

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
        return `http://${normalizedHost}:3000`;
    }

    return `https://${normalizedHost}`;
}
