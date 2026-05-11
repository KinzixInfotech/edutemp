const INTERNAL_PARENT_DOMAIN_PREFIX = "parent";
const INTERNAL_STUDENT_DOMAIN_PREFIX = "student";

function sanitizeNamespacePart(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

export function normalizePhoneNumber(phone) {
    const digits = String(phone || "").replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    if (digits.length === 10) {
        return digits;
    }

    if (digits.length === 12 && digits.startsWith("91")) {
        return digits.slice(-10);
    }

    if (digits.length === 13 && digits.startsWith("091")) {
        return digits.slice(-10);
    }

    if (digits.length > 10) {
        return digits.slice(-10);
    }

    return digits;
}

export function normalizeStudentIdentifier(studentId) {
    return String(studentId || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

export function normalizeAdmissionNumber(admissionNumber) {
    return normalizeStudentIdentifier(admissionNumber);
}

export function normalizeOptionalEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    return normalized || null;
}

export function getSchoolAuthNamespace(school) {
    const fromCode = sanitizeNamespacePart(school?.schoolCode);
    if (fromCode) {
        return fromCode;
    }

    const domain = String(school?.domain || "").trim().toLowerCase();
    const fromDomain = sanitizeNamespacePart(domain.split(".")[0]);
    if (fromDomain) {
        return fromDomain;
    }

    return sanitizeNamespacePart(school?.name) || "school";
}

export function buildParentAuthEmail({ phone, admissionNumber, school }) {
    const normalizedPhone = normalizePhoneNumber(phone);
    const namespace = getSchoolAuthNamespace(school);

    if (!normalizedPhone) {
        return "";
    }

    const localPart = normalizedPhone.toLowerCase().replace(/[^a-z0-9-]+/g, "");
    return `${localPart}@${INTERNAL_PARENT_DOMAIN_PREFIX}.${namespace}.local`;
}

export function buildParentPlaceholderAuthEmail({ schoolId, admissionNumber, school }) {
    const namespace = getSchoolAuthNamespace(school);
    const safeSchoolId = String(schoolId || school?.id || "school").toLowerCase().replace(/[^a-z0-9-]+/g, "");
    const safeAdmissionNumber = normalizeAdmissionNumber(admissionNumber) || "unknown";
    const localPart = `pending-${safeSchoolId}-${safeAdmissionNumber.toLowerCase()}`.replace(/[^a-z0-9-]+/g, "");
    return `${localPart}@${INTERNAL_PARENT_DOMAIN_PREFIX}.${namespace}.local`;
}

export function buildStudentAuthEmail({ studentId, school }) {
    const normalizedStudentId = normalizeStudentIdentifier(studentId);
    const namespace = getSchoolAuthNamespace(school);

    if (!normalizedStudentId) {
        return "";
    }

    const localPart = normalizedStudentId.toLowerCase().replace(/[^a-z0-9-]+/g, "");
    return `${localPart}@${INTERNAL_STUDENT_DOMAIN_PREFIX}.${namespace}.local`;
}

export function isInternalAuthEmail(email) {
    return /@(parent|student)\.[a-z0-9-]+\.local$/i.test(String(email || "").trim());
}

export function getVisibleContactEmail(...emails) {
    for (const candidate of emails) {
        const normalized = normalizeOptionalEmail(candidate);
        if (normalized && !isInternalAuthEmail(normalized)) {
            return normalized;
        }
    }

    return null;
}
