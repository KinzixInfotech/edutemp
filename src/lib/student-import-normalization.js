export function cleanImportString(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeImportObject(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' || typeof value === 'number' ? cleanImportString(value) : value,
    ])
  );
}

export function normalizeClassLookupKey(value) {
  const text = cleanImportString(value).toLowerCase();
  if (!text) return '';

  return text
    .replace(/\b(standard|std|class|grade)\b/g, '')
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bi\b/g, '1')
    .replace(/\bukg\b/g, 'upperkg')
    .replace(/\bu\.?\s*k\.?\s*g\.?\b/g, 'upperkg')
    .replace(/\blkg\b/g, 'lowerkg')
    .replace(/\bl\.?\s*k\.?\s*g\.?\b/g, 'lowerkg')
    .replace(/nursery|nur/g, 'nursery')
    .replace(/play\s*group|playgroup|play/g, 'play')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^0+(\d+)$/, '$1');
}

export function buildClassLookup(classes = []) {
  const lookup = new Map();

  for (const cls of classes) {
    const keys = new Set([
      normalizeClassLookupKey(cls.className),
    ]);

    const numberMatch = cleanImportString(cls.className).match(/\d+/);
    if (numberMatch) {
      keys.add(normalizeClassLookupKey(numberMatch[0]));
      keys.add(normalizeClassLookupKey(`std ${numberMatch[0]}`));
      keys.add(normalizeClassLookupKey(`class ${numberMatch[0]}`));
    }

    for (const key of keys) {
      if (key && !lookup.has(key)) lookup.set(key, cls);
    }
  }

  return lookup;
}

export function parseImportDate(value) {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    return parseExcelSerialDate(value);
  }

  const text = cleanImportString(value);
  if (!text) return '';

  if (/^\d{5}$/.test(text)) {
    return parseExcelSerialDate(Number(text));
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return formatDateParts(year, month, day);
  }

  const indianMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (indianMatch) {
    let [, day, month, year] = indianMatch;
    if (year.length === 2) year = Number(year) > 40 ? `19${year}` : `20${year}`;
    return formatDateParts(year, month, day);
  }

  return null;
}

function parseExcelSerialDate(value) {
  if (!Number.isFinite(value) || value < 20000 || value > 60000) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  epoch.setUTCDate(epoch.getUTCDate() + value);
  return epoch.toISOString().slice(0, 10);
}

function formatDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function normalizeStudentGender(value) {
  const text = cleanImportString(value).toLowerCase();
  if (!text) return '';
  if (['m', 'male', 'boy'].includes(text)) return 'Male';
  if (['f', 'female', 'girl'].includes(text)) return 'Female';
  if (['other', 'others', 'o'].includes(text)) return 'Other';
  return cleanImportString(value);
}

export function resolveStudentImportRow(data = {}, classes = [], classMappings = {}) {
  const normalized = normalizeImportObject(data);
  const errors = [];
  const warnings = [];
  const classLookup = buildClassLookup(classes);
  const rawClassName = cleanImportString(normalized.className);
  const rawSectionName = cleanImportString(normalized.sectionName);

  normalized.gender = normalizeStudentGender(normalized.gender);

  const parsedDob = parseImportDate(normalized.dob);
  if (parsedDob) {
    normalized.dob = parsedDob;
  } else if (parsedDob === null) {
    errors.push(`Invalid Date of Birth: "${normalized.dob}". Use YYYY-MM-DD or DD/MM/YYYY.`);
  }

  if (!normalized.name) errors.push('Missing required field: Full Name *');
  if (!normalized.gender) errors.push('Missing required field: Gender *');
  if (!normalized.dob) errors.push('Missing required field: Date of Birth *');

  const parsedAdmissionDate = parseImportDate(normalized.admissionDate);
  if (parsedAdmissionDate) {
    normalized.admissionDate = parsedAdmissionDate;
    normalized.missingJoiningDate = false;
    normalized.profileStatus = 'ACTIVE';
  } else if (parsedAdmissionDate === null) {
    errors.push(`Invalid Joining Date: "${normalized.admissionDate}". Use YYYY-MM-DD or DD/MM/YYYY.`);
  } else {
    normalized.admissionDate = null;
    normalized.missingJoiningDate = true;
    normalized.profileStatus = 'MISSING_JOIN_DATE';
    warnings.push('No joining/admission date provided. Student will import, but fee assignment and fee generation will be blocked until it is assigned.');
  }

  let resolvedClass = null;
  if (rawClassName) {
    const mappedClassId = classMappings[rawClassName] || classMappings[normalizeClassLookupKey(rawClassName)];
    resolvedClass = mappedClassId
      ? classes.find((cls) => String(cls.id) === String(mappedClassId))
      : classLookup.get(normalizeClassLookupKey(rawClassName));

    if (resolvedClass) {
      normalized.className = resolvedClass.className;
      normalized.classId = resolvedClass.id;
    } else {
      errors.push(`Unrecognized class "${rawClassName}". Map it to an existing class before import.`);
    }
  } else {
    normalized.className = '';
    normalized.classId = null;
    warnings.push('No class provided. Student will be imported without a class assignment.');
  }

  if (resolvedClass && rawSectionName) {
    const section = (resolvedClass.sections || []).find(
      (item) => cleanImportString(item.name).toLowerCase() === rawSectionName.toLowerCase()
    );

    if (section) {
      normalized.sectionName = section.name;
      normalized.sectionId = section.id;
    } else {
      normalized.sectionId = null;
      warnings.push(`Section "${rawSectionName}" was not found in ${resolvedClass.className}. Student will be imported without a section.`);
    }
  } else if (resolvedClass) {
    normalized.sectionId = null;
    warnings.push('No section provided. Student will be imported without a section.');
  } else {
    normalized.sectionName = '';
    normalized.sectionId = null;
  }

  return {
    data: normalized,
    errors,
    warnings,
    rawClassName,
    resolvedClass,
  };
}

export function summarizeUnresolvedClasses(rows = []) {
  const unresolved = new Map();

  for (const row of rows) {
    const rawClassName = cleanImportString(row.rawClassName || row.data?.className);
    if (!rawClassName) continue;
    if (!row.errors?.some((error) => error.startsWith('Unrecognized class'))) continue;

    const entry = unresolved.get(rawClassName) || { value: rawClassName, rows: [] };
    entry.rows.push(row.rowNumber);
    unresolved.set(rawClassName, entry);
  }

  return Array.from(unresolved.values());
}
