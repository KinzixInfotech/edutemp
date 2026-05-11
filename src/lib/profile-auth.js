import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
    buildParentAuthEmail,
    buildParentPlaceholderAuthEmail,
    buildStudentAuthEmail,
    normalizeAdmissionNumber,
    normalizeOptionalEmail,
    normalizePhoneNumber,
    normalizeStudentIdentifier,
} from "@/lib/auth-identifiers";

export async function getSchoolIdentityContext(schoolId, tx = prisma) {
    return tx.school.findUnique({
        where: { id: schoolId },
        select: {
            id: true,
            name: true,
            schoolCode: true,
            domain: true,
        },
    });
}

export async function generateNextStudentId({ schoolId, tx = prisma, year = new Date().getFullYear() }) {
    const prefix = `SCH-${year}-`;
    const students = await tx.student.findMany({
        where: {
            schoolId,
            admissionNo: {
                startsWith: prefix,
            },
        },
        select: {
            admissionNo: true,
        },
    });

    const nextSequence = students.reduce((maxSequence, student) => {
        const match = String(student.admissionNo || "").match(/^SCH-\d{4}-(\d{3,})$/i);
        const currentSequence = match ? Number(match[1]) : 0;
        return Math.max(maxSequence, currentSequence);
    }, 0) + 1;

    return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

export async function resolveStudentAccountIdentity({ schoolId, studentId, externalEmail, tx = prisma }) {
    const school = await getSchoolIdentityContext(schoolId, tx);
    if (!school) {
        throw new Error("School not found");
    }

    const normalizedStudentId = normalizeStudentIdentifier(studentId);
    return {
        school,
        studentId: normalizedStudentId,
        authEmail: buildStudentAuthEmail({ studentId: normalizedStudentId, school }),
        externalEmail: normalizeOptionalEmail(externalEmail),
    };
}

export async function resolveParentAccountIdentity({ schoolId, phone, admissionNumber, externalEmail, tx = prisma }) {
    const school = await getSchoolIdentityContext(schoolId, tx);
    if (!school) {
        throw new Error("School not found");
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedAdmissionNumber = normalizeAdmissionNumber(admissionNumber);
    return {
        school,
        phone: normalizedPhone,
        admissionNumber: normalizedAdmissionNumber,
        authEmail: normalizedPhone
            ? buildParentAuthEmail({ phone: normalizedPhone, school })
            : buildParentPlaceholderAuthEmail({ schoolId, admissionNumber: normalizedAdmissionNumber, school }),
        externalEmail: normalizeOptionalEmail(externalEmail),
    };
}

export function buildMissingContactPlaceholder({ schoolId, admissionNumber, role = "parent" }) {
    const safeAdmissionNumber = normalizeAdmissionNumber(admissionNumber) || "UNKNOWN";
    return `missing:${role}:${schoolId}:${safeAdmissionNumber}`.slice(0, 191);
}

export function isMissingContactPlaceholder(value) {
    return String(value || "").startsWith("missing:");
}

export async function compareStoredPassword(storedPassword, password) {
    if (!storedPassword || !password) {
        return false;
    }

    if (storedPassword === password) {
        return true;
    }

    if (/^\$2[aby]\$\d{2}\$/.test(storedPassword)) {
        return bcrypt.compare(password, storedPassword);
    }

    return false;
}
