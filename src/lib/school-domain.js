const TENANT_BASE_DOMAIN = 'erp.edubreezy.com';
const LEGACY_TENANT_BASE_DOMAIN = 'edubreezy.com';

export function normalizeTenantName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9-]/g, '');
}

export function buildTenantDomain(tenantName) {
    const normalizedTenantName = normalizeTenantName(tenantName);
    return normalizedTenantName ? `${normalizedTenantName}.${TENANT_BASE_DOMAIN}` : '';
}

export function buildLegacyTenantDomain(tenantName) {
    const normalizedTenantName = normalizeTenantName(tenantName);
    return normalizedTenantName ? `${normalizedTenantName}.${LEGACY_TENANT_BASE_DOMAIN}` : '';
}

export function normalizeSchoolDomain(domain) {
    const trimmed = String(domain || '').trim().toLowerCase();
    if (!trimmed) {
        return '';
    }

    if (trimmed.endsWith(`.${TENANT_BASE_DOMAIN}`)) {
        return trimmed;
    }

    if (trimmed.endsWith(`.${LEGACY_TENANT_BASE_DOMAIN}`)) {
        return trimmed.replace(`.${LEGACY_TENANT_BASE_DOMAIN}`, `.${TENANT_BASE_DOMAIN}`);
    }

    return trimmed;
}

export function isLegacyTenantDomain(domain) {
    return String(domain || '').trim().toLowerCase().endsWith(`.${LEGACY_TENANT_BASE_DOMAIN}`);
}

export { TENANT_BASE_DOMAIN, LEGACY_TENANT_BASE_DOMAIN };
