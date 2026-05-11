import { pickBestSignature } from '@/lib/document-signature-library';

export const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

const FIELD_ALIASES = {
    studentname: ['student.name', 'student.user.name'],
    student_name: ['student.name', 'student.user.name'],
    admissionno: ['student.admissionNo'],
    admission_no: ['student.admissionNo'],
    admission_number: ['student.admissionNo'],
    class: ['student.class.className', 'student.className'],
    section: ['student.section.sectionName', 'student.sectionName', 'student.section'],
    rollnumber: ['student.rollNumber'],
    roll_number: ['student.rollNumber'],
    dob: ['student.dob'],
    studentphoto: ['assets.studentPhoto'],
    student_photo: ['assets.studentPhoto'],
    fathername: ['student.fatherName', 'parent.fatherName'],
    father_name: ['student.fatherName', 'parent.fatherName'],
    mothername: ['student.motherName', 'parent.motherName'],
    mother_name: ['student.motherName', 'parent.motherName'],
    parentphone: ['parent.phone', 'student.parentContact'],
    parent_phone: ['parent.phone', 'student.parentContact'],
    schoolname: ['school.name'],
    school_name: ['school.name'],
    schoollogo: ['assets.schoolLogo'],
    school_logo: ['assets.schoolLogo'],
    schooladdress: ['school.address'],
    school_address: ['school.address'],
    principalsignature: ['assets.principalSignature'],
    principal_signature: ['assets.principalSignature'],
    examname: ['exam.name', 'exam.title'],
    exam_name: ['exam.name', 'exam.title'],
    examdate: ['exam.examDate', 'form.examDate'],
    exam_date: ['exam.examDate', 'form.examDate'],
    examcenter: ['exam.center', 'form.center'],
    exam_center: ['exam.center', 'form.center'],
    marks: ['result.marks', 'form.marks'],
    grade: ['result.grade', 'form.grade'],
    percentage: ['result.percentage', 'form.percentage'],
    certificate_number: ['meta.certificateNumber'],
    certificatenumber: ['meta.certificateNumber'],
    certificate_id: ['meta.certificateNumber'],
    issue_date: ['form.issueDate'],
    issuedate: ['form.issueDate'],
    verificationurl: ['meta.verificationUrl'],
    verification_url: ['meta.verificationUrl'],
    exam_schedule: ['exam.scheduleText'],
    examschedule: ['exam.scheduleText'],
    seat_number: ['form.seatNumber', 'exam.seatNumber'],
    seatnumber: ['form.seatNumber', 'exam.seatNumber'],
    validuntil: ['form.validUntil'],
    valid_until: ['form.validUntil'],
    schoolstamp: ['assets.schoolStamp'],
    school_stamp: ['assets.schoolStamp'],
    classteachersignature: ['assets.classTeacherSignature'],
    class_teacher_signature: ['assets.classTeacherSignature'],
};

function getByPath(obj, path) {
    return String(path || '').split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function formatDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValue(value) {
    if (value == null) return '';
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
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
    const walk = (items = []) => {
        items.forEach((el) => {
            [el?.content, el?.url, el?.mapping].filter(Boolean).forEach((text) => {
                String(text).match(PLACEHOLDER_REGEX)?.forEach((match) => {
                    found.add(match.replace(/[{}]/g, '').trim());
                });
            });
            if (Array.isArray(el?.items)) walk(el.items);
        });
    };
    walk(elements);
    return Array.from(found).sort();
}

function buildExamScheduleText(exam = {}, fallbackTime = '') {
    if (Array.isArray(exam?.subjects) && exam.subjects.length > 0) {
        return exam.subjects.map((examSubject) => {
            const date = examSubject?.date ? formatDate(examSubject.date) : 'TBA';
            const subjectName = examSubject?.subject?.subjectName || examSubject?.subjectName || 'Subject';
            const time = examSubject?.startTime && examSubject?.endTime
                ? `${examSubject.startTime} - ${examSubject.endTime}`
                : fallbackTime || 'TBA';
            return [date, subjectName, time, examSubject?.maxMarks].filter(Boolean).join(' | ');
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
    result = {},
    assets = {},
} = {}) {
    const signatures = Array.isArray(docSettings?.signatures) ? docSettings.signatures : [];
    const teacherUserId = student?.section?.teachingStaffUserId || student?.class?.teachingStaffUserId || null;
    const normalizedStudent = {
        ...student,
        name: student?.user?.name || student?.name || '',
        fatherName: student?.FatherName || student?.fatherName || '',
        motherName: student?.MotherName || student?.motherName || '',
        admissionNo: student?.admissionNo || student?.admissionNumber || '',
        address: student?.Address || student?.address || '',
        section: student?.section ? { ...student.section, sectionName: student.section?.sectionName || student.section?.name || '' } : student?.section,
    };
    const school = fullUser?.school || {};
    const normalizedExam = {
        ...exam,
        name: exam?.title || exam?.name || formValues?.examName || '',
        title: exam?.title || exam?.name || formValues?.examName || '',
        examDate: formatDate(formValues?.examDate || exam?.startDate || exam?.examDate),
        center: formValues?.center || exam?.center || '',
        venue: formValues?.venue || exam?.venue || '',
        seatNumber: formValues?.seatNumber || '',
        scheduleText: buildExamScheduleText(exam, formValues?.examTime || ''),
    };

    return {
        student: normalizedStudent,
        parent: {
            fatherName: normalizedStudent.fatherName || '',
            motherName: normalizedStudent.motherName || '',
            phone: normalizedStudent.parentContact || normalizedStudent.fatherPhone || normalizedStudent.motherPhone || '',
        },
        school: {
            ...school,
            name: fullUser?.schoolName || school?.name || '',
            address: school?.address || school?.location || fullUser?.schoolAddress || fullUser?.address || '',
            academicYearName: selectedYear?.name || selectedYear?.label || '',
        },
        form: {
            ...formValues,
            issueDate: formValues?.issueDate ? formatDate(formValues.issueDate) : formatDate(new Date()),
            examDate: formValues?.examDate ? formatDate(formValues.examDate) : normalizedExam.examDate,
            validUntil: formValues?.validUntil ? formatDate(formValues.validUntil) : '',
        },
        exam: normalizedExam,
        result,
        meta: certificateMeta,
        assets: {
            studentPhoto: normalizedStudent?.user?.profilePicture || normalizedStudent?.photoUrl || normalizedStudent?.photo || '',
            schoolLogo: school?.profilePicture || fullUser?.schoolLogo || fullUser?.profilePicture || '',
            principalSignature: docSettings?.signatureUrl || pickBestSignature(signatures, { placeholderKey: 'principalSignature' })?.imageUrl || school?.signatureUrl || '',
            classTeacherSignature: pickBestSignature(signatures, {
                placeholderKey: 'classTeacherSignature',
                teacherUserId,
                classId: student?.classId ?? student?.class?.id ?? null,
                sectionId: student?.sectionId ?? student?.section?.id ?? null,
            })?.imageUrl || '',
            schoolStamp: docSettings?.stampUrl || school?.stampUrl || fullUser?.stampUrl || '',
            ...assets,
        },
    };
}

export function resolveField(rawKey, context = {}) {
    const normalized = normalizePlaceholderKey(rawKey);
    const candidatePaths = [
        ...(FIELD_ALIASES[normalized] || []),
        rawKey,
        normalized,
        normalized.replace(/_/g, '.'),
        `student.${normalized}`,
        `parent.${normalized}`,
        `school.${normalized}`,
        `exam.${normalized}`,
        `result.${normalized}`,
        `form.${normalized}`,
        `meta.${normalized}`,
        `assets.${normalized}`,
    ];
    for (const path of candidatePaths) {
        const value = getByPath(context, path);
        if (value !== undefined && value !== null && value !== '') return formatValue(value);
    }
    return '';
}

export function sharedFieldResolver(rawKey, context = {}) {
    return resolveField(rawKey, context);
}

export const resolveDocumentPlaceholderValue = resolveField;
export const resolveCertificatePlaceholderValue = resolveField;
export const buildCertificateMappingContext = buildDocumentMappingContext;

export function buildResolvedMappings(placeholderKeys = [], context = {}, fieldOverrides = {}) {
    return placeholderKeys.reduce((acc, key) => {
        acc[key] = fieldOverrides[key] !== undefined && fieldOverrides[key] !== ''
            ? fieldOverrides[key]
            : sharedFieldResolver(key, context);
        return acc;
    }, {});
}

export function applyMappingsToTemplateElements(elements = [], resolvedMappings = {}, imageFallbackUrl = 'https://placehold.co/100x100?text=Image') {
    const replaceTokens = (text) => (text ? String(text).replace(PLACEHOLDER_REGEX, (_, key) => resolvedMappings[key.trim()] || '') : text);
    return elements.map((el) => {
        if (Array.isArray(el.items)) return { ...el, items: applyMappingsToTemplateElements(el.items, resolvedMappings, imageFallbackUrl) };
        if ((el.type === 'text' || el.type === 'qrcode' || el.type === 'barcode') && (el.content || el.mapping)) {
            return { ...el, content: replaceTokens(el.content || el.mapping) };
        }
        if (el.type === 'image' || el.type === 'signature') {
            const resolvedUrl = replaceTokens(el.url || el.mapping || '');
            return { ...el, url: resolvedUrl || imageFallbackUrl };
        }
        if (el.type === 'table' && el.dataSource === 'exam_subjects') {
            const tableData = Array.isArray(resolvedMappings.__examSubjects)
                ? resolvedMappings.__examSubjects.map((subject) => ({
                    date: subject?.date ? formatDate(subject.date) : '',
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

export function normalizeTemplateLayout(layoutConfig = {}) {
    const canvasSize = layoutConfig?.canvasSize || {};
    const width = Number(canvasSize.width) || 794;
    const height = Number(canvasSize.height) || 1123;
    return {
        ...layoutConfig,
        canvasSize: { width, height },
        canvasWidth: width,
        canvasHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        elements: Array.isArray(layoutConfig?.elements) ? layoutConfig.elements : [],
    };
}

export function buildResolvedTemplateConfig({ layoutConfig = {}, context = {}, fieldOverrides = {}, imageFallbackUrl } = {}) {
    const stableLayout = normalizeTemplateLayout(layoutConfig);
    const placeholderKeys = extractTemplatePlaceholders(stableLayout.elements);
    const resolvedMappings = buildResolvedMappings(placeholderKeys, context, fieldOverrides);
    return {
        ...stableLayout,
        elements: applyMappingsToTemplateElements(
            JSON.parse(JSON.stringify(stableLayout.elements)),
            context?.__examSubjects ? { ...resolvedMappings, __examSubjects: context.__examSubjects } : resolvedMappings,
            imageFallbackUrl,
        ),
        resolvedMappings,
        placeholderKeys,
    };
}
