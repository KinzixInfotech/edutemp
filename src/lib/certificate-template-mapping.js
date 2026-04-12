import { pickBestSignature } from '@/lib/document-signature-library';

export const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

const PLACEHOLDER_ALIASES = {
    student_name: ['student.name', 'student.user.name'],
    studentname: ['student.name', 'student.user.name'],
    roll_number: ['student.rollNumber'],
    rollnumber: ['student.rollNumber'],
    admission_no: ['student.admissionNo'],
    admission_number: ['student.admissionNo'],
    admissionno: ['student.admissionNo'],
    class: ['student.class.className', 'student.className'],
    class_name: ['student.class.className', 'student.className'],
    section: ['student.section.sectionName', 'student.section', 'student.sectionName'],
    section_name: ['student.section.sectionName', 'student.section', 'student.sectionName'],
    dob: ['student.dob'],
    date_of_birth: ['student.dob'],
    father_name: ['student.fatherName', 'parent.fatherName'],
    fathername: ['student.fatherName', 'parent.fatherName'],
    mother_name: ['student.motherName', 'parent.motherName'],
    mothername: ['student.motherName', 'parent.motherName'],
    gender: ['student.gender'],
    blood_group: ['student.bloodGroup'],
    address: ['student.address'],
    issue_date: ['form.issueDate'],
    conduct: ['form.conductLabel', 'form.conduct'],
    remarks: ['form.remarks'],
    purpose: ['form.purpose'],
    academic_year: ['form.academicYear', 'school.academicYearName'],
    date_of_leaving: ['form.dateOfLeaving'],
    reason: ['form.reason'],
    event_name: ['form.eventName'],
    position: ['form.position'],
    title: ['form.title'],
    content: ['form.content'],
    school_name: ['school.name'],
    schoolname: ['school.name'],
    school_address: ['school.address'],
    schooladdress: ['school.address'],
    school_logo: ['assets.schoolLogo'],
    schoollogo: ['assets.schoolLogo'],
    principal_signature: ['assets.principalSignature'],
    principalsignature: ['assets.principalSignature'],
    class_teacher_signature: ['assets.classTeacherSignature'],
    classteachersignature: ['assets.classTeacherSignature'],
    school_stamp: ['assets.schoolStamp'],
    schoolstamp: ['assets.schoolStamp'],
    student_photo: ['assets.studentPhoto'],
    studentphoto: ['assets.studentPhoto'],
    verification_url: ['meta.verificationUrl'],
    verificationurl: ['meta.verificationUrl'],
    certificate_number: ['meta.certificateNumber'],
    certificatenumber: ['meta.certificateNumber'],
    tc_number: ['meta.tcNumber'],
    tcnumber: ['meta.tcNumber'],
    nationality: ['student.nationality'],
    religion: ['student.religion'],
    category: ['student.category'],
    admission_date: ['student.admissionDate'],
    parent_contact: ['student.parentContact', 'parent.phone'],
    issuedate: ['form.issueDate'],
    academicyear: ['form.academicYear', 'school.academicYearName'],
    eventname: ['form.eventName'],
    admissiondate: ['student.admissionDate'],
};

function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function normalizePlaceholderKey(key) {
    return String(key || '')
        .replace(/[{}]/g, '')
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s.-]+/g, '_')
        .replace(/__+/g, '_')
        .toLowerCase();
}

export function extractTemplatePlaceholders(elements = []) {
    const found = new Set();

    const walk = (items) => {
        items.forEach((el) => {
            const sources = [el?.content, el?.url].filter(Boolean);
            sources.forEach((text) => {
                const matches = String(text).match(PLACEHOLDER_REGEX);
                if (matches) {
                    matches.forEach((match) => found.add(match.replace(/[{}]/g, '').trim()));
                }
            });

            if (el?.type === 'group' && Array.isArray(el.items)) {
                walk(el.items);
            }
        });
    };

    walk(elements);
    return Array.from(found).sort();
}

function formatValue(value) {
    if (value == null) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

export function buildCertificateMappingContext({
    student = {},
    formValues = {},
    fullUser = {},
    selectedYear = null,
    docSettings = {},
    certificateMeta = {},
    assets = {},
}) {
    const signatureLibrary = Array.isArray(docSettings?.signatures) ? docSettings.signatures : [];
    const teacherUserId = student?.section?.teachingStaffUserId || student?.class?.teachingStaffUserId || null;
    const bestPrincipalSignature = pickBestSignature(signatureLibrary, {
        placeholderKey: 'principalSignature',
    });
    const bestClassTeacherSignature = pickBestSignature(signatureLibrary, {
        placeholderKey: 'classTeacherSignature',
        teacherUserId,
        classId: student?.classId ?? student?.class?.id ?? null,
        sectionId: student?.sectionId ?? student?.section?.id ?? null,
    });

    return {
        student: {
            ...student,
            // these as PascalCase — normalize both
            fatherName: student?.FatherName || student?.fatherName || '',
            motherName: student?.MotherName || student?.motherName || '',
            name: student?.user?.name || student?.name || '',
        },
        parent: {
            fatherName: student?.fatherName || '',
            motherName: student?.motherName || '',
            phone: student?.parentContact || student?.fatherPhone || student?.motherPhone || '',
        },
        teacher: {},
        school: {
            name: fullUser?.schoolName || fullUser?.school?.name || '',
            address: fullUser?.school?.address || fullUser?.schoolAddress || fullUser?.address || '',
            academicYearName: selectedYear?.name || selectedYear?.label || '',
        },
        form: {
            ...formValues,
            conductLabel: formValues?.conductLabel || '',
            issueDate: formValues?.issueDate ? new Date(formValues.issueDate).toLocaleDateString() : new Date().toLocaleDateString(),
            dateOfLeaving: formValues?.dateOfLeaving ? new Date(formValues.dateOfLeaving).toLocaleDateString() : '',
        },
        meta: certificateMeta,
        // assets: {
        //     studentPhoto: student?.user?.profilePicture || student?.photoUrl || student?.photo || '',
        //     schoolLogo: fullUser?.school?.profilePicture || '',
        //     principalSignature: docSettings?.signatureUrl || bestPrincipalSignature?.imageUrl || fullUser?.school?.signatureUrl || '',
        //     classTeacherSignature: bestClassTeacherSignature?.imageUrl || '',
        //     schoolStamp: docSettings?.stampUrl || fullUser?.school?.stampUrl || '',
        //     ...assets,
        // },
        assets: {
            studentPhoto: student?.user?.profilePicture || student?.photoUrl || '',
            schoolLogo: fullUser?.school?.profilePicture || fullUser?.schoolLogo || fullUser?.profilePicture || '',
            principalSignature: docSettings?.signatureUrl || bestPrincipalSignature?.imageUrl || fullUser?.school?.signatureUrl || '',
            classTeacherSignature: bestClassTeacherSignature?.imageUrl || '',
            schoolStamp: docSettings?.stampUrl || fullUser?.school?.stampUrl || fullUser?.stampUrl || '',
            ...assets,
        },
    };
}

export function resolveCertificatePlaceholderValue(rawKey, context) {
    const normalized = normalizePlaceholderKey(rawKey);
    const candidatePaths = [
        ...(PLACEHOLDER_ALIASES[normalized] || []),
        rawKey,
        normalized,
        normalized.replace(/_/g, '.'),
        `student.${normalized}`,
        `form.${normalized}`,
        `school.${normalized}`,
        `meta.${normalized}`,
        `assets.${normalized}`,
    ];

    for (const path of candidatePaths) {
        const value = getByPath(context, path);
        if (value !== undefined && value !== null && value !== '') {
            return formatValue(value);
        }
    }

    return '';
}

export function buildResolvedMappings(placeholderKeys = [], context = {}, fieldOverrides = {}) {
    return placeholderKeys.reduce((acc, key) => {
        acc[key] = fieldOverrides[key] !== undefined && fieldOverrides[key] !== ''
            ? fieldOverrides[key]
            : resolveCertificatePlaceholderValue(key, context);
        return acc;
    }, {});
}

export function applyMappingsToTemplateElements(elements = [], resolvedMappings = {}, imageFallbackUrl = 'https://placehold.co/100x100?text=Image') {
    const replaceTokens = (text) => {
        if (!text) return text;
        return String(text).replace(PLACEHOLDER_REGEX, (_, key) => resolvedMappings[key.trim()] || '');
    };

    return elements.map((el) => {
        if (el.type === 'group' && Array.isArray(el.items)) {
            return { ...el, items: applyMappingsToTemplateElements(el.items, resolvedMappings, imageFallbackUrl) };
        }
        if ((el.type === 'text' || el.type === 'qrcode') && el.content) {
            return { ...el, content: replaceTokens(el.content) };
        }
        if (el.type === 'image') {
            const resolvedUrl = replaceTokens(el.url || '');
            return {
                ...el,
                url: resolvedUrl || imageFallbackUrl,
            };
        }
        return el;
    });
}
