import prisma from '@/lib/prisma';
import { getCanonicalOriginForHost, getTenantDomainCandidates, isSchoolTenantHost, normalizeHost } from '@/lib/tenant-host';

const schoolTenantSelect = {
    id: true,
    name: true,
    domain: true,
    schoolCode: true,
    profilePicture: true,
    contactNumber: true,
    status: true,
    publicProfile: {
        select: {
            tagline: true,
            description: true,
            coverImage: true,
            logoImage: true,
        },
    },
};

export async function getSchoolTenantByHost(host) {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost || !isSchoolTenantHost(normalizedHost)) {
        return null;
    }

    const candidates = getTenantDomainCandidates(normalizedHost);

    if (!candidates.length) {
        return null;
    }

    return prisma.school.findFirst({
        where: {
            OR: candidates.map((candidate) => ({
                domain: {
                    equals: candidate,
                    mode: 'insensitive',
                },
            })),
        },
        select: schoolTenantSelect,
    });
}

export function getSchoolTenantMetadata(school, host) {
    const origin = school?.domain
        ? getCanonicalOriginForHost(school.domain)
        : getCanonicalOriginForHost(host);
    const loginUrl = `${origin}/login`;
    const schoolName = school?.name || 'School';
    const schoolCode = school?.schoolCode || '';
    const summary = school?.publicProfile?.description?.trim()
        || `Access the secure ERP login portal for ${schoolName} on EduBreezy.`;

    return {
        origin,
        loginUrl,
        title: `Login to ${schoolName} - ERP | EduBreezy`,
        description: schoolCode ? `${summary} School code: ${schoolCode}.` : summary,
        schoolName,
        schoolCode,
    };
}
