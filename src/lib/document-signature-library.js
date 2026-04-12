export const SIGNATURE_PLACEHOLDER_KEYS = [
    'principalSignature',
    'classTeacherSignature',
];

export function normalizeSignaturePlaceholderKey(value) {
    const normalized = String(value || '').replace(/[{}]/g, '').trim();
    if (normalized === 'principal_signature') return 'principalSignature';
    if (normalized === 'class_teacher_signature') return 'classTeacherSignature';
    return normalized;
}

export function serializeSignatureAsset(signature) {
    if (!signature) return null;
    return {
        id: signature.id,
        name: signature.name,
        designation: signature.designation || '',
        imageUrl: signature.imageUrl,
        placeholderKey: normalizeSignaturePlaceholderKey(signature.placeholderKey),
        teacherUserId: signature.teacherUserId || null,
        classId: signature.classId ?? null,
        sectionId: signature.sectionId ?? null,
        tags: Array.isArray(signature.tags) ? signature.tags : [],
        isDefault: !!signature.isDefault,
        isActive: !!signature.isActive,
        teacher: signature.teacher ? {
            userId: signature.teacher.userId,
            name: signature.teacher.name,
            employeeId: signature.teacher.employeeId,
        } : null,
        class: signature.class ? {
            id: signature.class.id,
            className: signature.class.className,
        } : null,
        section: signature.section ? {
            id: signature.section.id,
            name: signature.section.name,
            classId: signature.section.classId,
        } : null,
        createdAt: signature.createdAt,
        updatedAt: signature.updatedAt,
    };
}

export function pickBestSignature(signatures = [], {
    placeholderKey,
    teacherUserId = null,
    classId = null,
    sectionId = null,
} = {}) {
    const normalizedKey = normalizeSignaturePlaceholderKey(placeholderKey);
    const matching = signatures.filter(signature =>
        signature &&
        signature.isActive !== false &&
        normalizeSignaturePlaceholderKey(signature.placeholderKey) === normalizedKey
    );

    if (!matching.length) return null;

    const scoreSignature = (signature) => {
        let score = 0;
        if (sectionId && signature.sectionId === sectionId) score += 100;
        if (classId && signature.classId === classId) score += 40;
        if (teacherUserId && signature.teacherUserId === teacherUserId) score += 20;
        if (signature.isDefault) score += 10;
        return score;
    };

    return [...matching].sort((a, b) => {
        const scoreDiff = scoreSignature(b) - scoreSignature(a);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    })[0] || null;
}

export function buildSignatureWarning({ placeholderKey, resolvedUrl, signatures = [] }) {
    const normalizedKey = normalizeSignaturePlaceholderKey(placeholderKey);
    if (resolvedUrl) return null;
    if (!SIGNATURE_PLACEHOLDER_KEYS.includes(normalizedKey)) return null;

    const availableCount = signatures.filter(signature =>
        normalizeSignaturePlaceholderKey(signature.placeholderKey) === normalizedKey && signature.isActive !== false
    ).length;

    if (availableCount > 0) {
        return `No matching ${normalizedKey === 'classTeacherSignature' ? 'class teacher' : 'principal'} signature was resolved for this preview.`;
    }

    return `${normalizedKey === 'classTeacherSignature' ? 'Class teacher' : 'Principal'} signature image does not exist yet. Upload one to the signature library.`;
}
