import { pickBestSignature } from '@/lib/document-signature-library';

export const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

const PLACEHOLDER_ALIASES = {
    student_name: ['student.name', 'student.user.name'],
    studentname: ['student.name', 'student.user.name'],
    student_id: ['student.studentId', 'student.userId', 'meta.studentId'],
    studentid: ['student.studentId', 'student.userId', 'meta.studentId'],
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
    exam_name: ['exam.name', 'exam.title'],
    examname: ['exam.name', 'exam.title'],
    exam_date: ['exam.examDate', 'exam.startDate', 'form.examDate'],
    examdate: ['exam.examDate', 'exam.startDate', 'form.examDate'],
    exam_time: ['exam.examTime', 'form.examTime'],
    examtime: ['exam.examTime', 'form.examTime'],
    exam_center: ['exam.center', 'form.center'],
    examcenter: ['exam.center', 'form.center'],
    exam_schedule: ['exam.scheduleText'],
    examschedule: ['exam.scheduleText'],
    seat_number: ['form.seatNumber', 'exam.seatNumber'],
    seatnumber: ['form.seatNumber', 'exam.seatNumber'],
    center: ['form.center', 'exam.center'],
    venue: ['form.venue', 'exam.venue'],
    valid_until: ['form.validUntil', 'exam.validUntil'],
    validuntil: ['form.validUntil', 'exam.validUntil'],
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

function formatDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
}

function buildExamScheduleText(exam = {}, fallbackTime = '') {
    if (Array.isArray(exam?.subjects) && exam.subjects.length > 0) {
        return exam.subjects.map((examSubject) => {
            const date = examSubject?.date
                ? new Date(examSubject.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })
                : 'TBA';
            const subjectName = examSubject?.subject?.subjectName || examSubject?.subjectName || 'Subject';
            const time = examSubject?.startTime && examSubject?.endTime
                ? `${examSubject.startTime} - ${examSubject.endTime}`
                : fallbackTime || 'TBA';
            const marks = examSubject?.maxMarks || '';
            return [date, subjectName, time, marks].filter(Boolean).join('  |  ');
        }).join('\n');
    }

    return exam?.title || exam?.name || '';
}

export function buildDocumentMappingContext({
    student = {},
    formValues = {},
    fullUser = {},
    selectedYear = null,
    docSettings = {},
    certificateMeta = {},
    exam = {},
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

    const normalizedStudent = {
        ...student,
        name: student?.user?.name || student?.name || '',
        fatherName: student?.FatherName || student?.fatherName || '',
        motherName: student?.MotherName || student?.motherName || '',
        admissionNo: student?.admissionNo || student?.admissionNumber || '',
        address: student?.Address || student?.address || '',
        userId: student?.userId || student?.studentId || '',
        section: student?.section ? {
            ...student.section,
            sectionName: student.section?.sectionName || student.section?.name || '',
        } : null,
    };

    const school = fullUser?.school || {};
    const normalizedExam = {
        ...exam,
        name: exam?.title || exam?.name || '',
        title: exam?.title || exam?.name || '',
        examDate: formatDate(formValues?.examDate || exam?.startDate || exam?.examDate),
        examTime: formValues?.examTime || '',
        center: formValues?.center || exam?.center || '',
        venue: formValues?.venue || exam?.venue || '',
        seatNumber: formValues?.seatNumber || '',
        scheduleText: buildExamScheduleText(exam, formValues?.examTime || ''),
        subjects: Array.isArray(exam?.subjects) ? exam.subjects : [],
    };

    return {
        student: normalizedStudent,
        parent: {
            fatherName: normalizedStudent?.fatherName || '',
            motherName: normalizedStudent?.motherName || '',
            phone: normalizedStudent?.parentContact || normalizedStudent?.fatherPhone || normalizedStudent?.motherPhone || '',
        },
        teacher: {},
        school: {
            ...school,
            name: fullUser?.schoolName || school?.name || '',
            address: school?.address || school?.location || fullUser?.schoolAddress || fullUser?.address || '',
            academicYearName: selectedYear?.name || selectedYear?.label || '',
        },
        form: {
            ...formValues,
            conductLabel: formValues?.conductLabel || '',
            issueDate: formValues?.issueDate ? formatDate(formValues.issueDate) : formatDate(new Date()),
            dateOfLeaving: formValues?.dateOfLeaving ? formatDate(formValues.dateOfLeaving) : '',
            examDate: formValues?.examDate ? formatDate(formValues.examDate) : normalizedExam.examDate,
            validUntil: formValues?.validUntil ? formatDate(formValues.validUntil) : '',
        },
        exam: normalizedExam,
        meta: certificateMeta,
        assets: {
            studentPhoto: normalizedStudent?.user?.profilePicture || normalizedStudent?.photoUrl || normalizedStudent?.photo || '',
            schoolLogo: school?.profilePicture || fullUser?.schoolLogo || fullUser?.profilePicture || '',
            principalSignature: docSettings?.signatureUrl || bestPrincipalSignature?.imageUrl || school?.signatureUrl || '',
            classTeacherSignature: bestClassTeacherSignature?.imageUrl || '',
            schoolStamp: docSettings?.stampUrl || school?.stampUrl || fullUser?.stampUrl || '',
            ...assets,
        },
    };
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
    return buildDocumentMappingContext({
        student,
        formValues,
        fullUser,
        selectedYear,
        docSettings,
        certificateMeta,
        assets,
    });
}

export function resolveDocumentPlaceholderValue(rawKey, context) {
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

export function resolveCertificatePlaceholderValue(rawKey, context) {
    return resolveDocumentPlaceholderValue(rawKey, context);
}

export function buildResolvedMappings(placeholderKeys = [], context = {}, fieldOverrides = {}) {
    return placeholderKeys.reduce((acc, key) => {
        acc[key] = fieldOverrides[key] !== undefined && fieldOverrides[key] !== ''
            ? fieldOverrides[key]
            : resolveDocumentPlaceholderValue(key, context);
        return acc;
    }, {});
}

export function buildResolvedTemplateConfig({
    layoutConfig = {},
    context = {},
    fieldOverrides = {},
    imageFallbackUrl,
}) {
    const placeholderKeys = extractTemplatePlaceholders(layoutConfig?.elements || []);
    const resolvedMappings = buildResolvedMappings(placeholderKeys, context, fieldOverrides);

    return {
        ...layoutConfig,
        elements: applyMappingsToTemplateElements(
            JSON.parse(JSON.stringify(layoutConfig?.elements || [])),
            context?.__examSubjects
                ? { ...resolvedMappings, __examSubjects: context.__examSubjects }
                : resolvedMappings,
            imageFallbackUrl,
        ),
        resolvedMappings,
        placeholderKeys,
    };
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
        if (el.type === 'table' && el.dataSource === 'exam_subjects') {
            const tableData = Array.isArray(resolvedMappings.__examSubjects)
                ? resolvedMappings.__examSubjects.map((subject) => ({
                    date: subject?.date
                        ? new Date(subject.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '',
                    subject: subject?.subject?.subjectName || subject?.subjectName || '',
                    time: subject?.startTime && subject?.endTime ? `${subject.startTime} - ${subject.endTime}` : '',
                    marks: subject?.maxMarks || '',
                }))
                : [];
            return { ...el, tableData };
        }
        return el;
    });
}
