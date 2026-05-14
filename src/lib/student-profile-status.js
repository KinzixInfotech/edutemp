export const STUDENT_PROFILE_STATUS = {
  ACTIVE: 'ACTIVE',
  MISSING_JOIN_DATE: 'MISSING_JOIN_DATE',
};

export function normalizeJoiningDateState(admissionDate) {
  const date = typeof admissionDate === 'string' ? admissionDate.trim() : admissionDate;
  const missing = !date;

  return {
    admissionDate: missing ? null : date,
    missingJoiningDate: missing,
    profileStatus: missing
      ? STUDENT_PROFILE_STATUS.MISSING_JOIN_DATE
      : STUDENT_PROFILE_STATUS.ACTIVE,
  };
}

export function studentMissingJoiningDate(student = {}) {
  return Boolean(
    student.missingJoiningDate ||
    student.profileStatus === STUDENT_PROFILE_STATUS.MISSING_JOIN_DATE ||
    !String(student.admissionDate || '').trim()
  );
}

export function assertStudentHasJoiningDate(student = {}, action = 'continue') {
  if (studentMissingJoiningDate(student)) {
    const label = student.name || student.admissionNo || student.userId || 'student';
    throw new Error(`Joining date is required before ${action} for ${label}.`);
  }
}
