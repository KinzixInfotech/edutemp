const IGNORED_HEADER_NAMES = new Set([
  '#',
  'no',
  's no',
  'sno',
  's number',
  'serial no',
  'serial number',
  'sr no',
  'sr number',
  'sl no',
  'sl number',
]);

export function normalizeImportColumnName(column) {
  return String(column || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*\*\s*/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isIgnoredImportColumn(column) {
  return IGNORED_HEADER_NAMES.has(normalizeImportColumnName(column));
}

function cleanColumnLabel(column) {
  return String(column || '')
    .replace(/\s*\*\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildImportFieldDefinitions(fieldMap = {}) {
  const definitions = new Map();

  for (const [excelColumn, dbField] of Object.entries(fieldMap)) {
    const label = cleanColumnLabel(excelColumn);
    const existing = definitions.get(dbField) || {
      field: dbField,
      label,
      required: false,
      aliases: [],
      normalizedAliases: [],
    };

    existing.label = label;
    existing.required = existing.required || excelColumn.includes('*');
    if (!existing.aliases.includes(label)) {
      existing.aliases.push(label);
    }

    const normalized = normalizeImportColumnName(excelColumn);
    if (!existing.normalizedAliases.includes(normalized)) {
      existing.normalizedAliases.push(normalized);
    }

    definitions.set(dbField, existing);
  }

  return Array.from(definitions.values());
}

export function formatImportFieldLabel(definition) {
  return `${definition.label}${definition.required ? ' *' : ''}`;
}

function findDefinitionForColumn(definitions, column) {
  const normalized = normalizeImportColumnName(column);
  return definitions.find((definition) => definition.normalizedAliases.includes(normalized));
}

export function analyzeImportHeaders(rawColumns = [], fieldMap = {}) {
  const definitions = buildImportFieldDefinitions(fieldMap);
  const allColumns = rawColumns.filter((column) => String(column || '').trim());
  const ignoredColumns = allColumns.filter(isIgnoredImportColumn);
  const uploadedColumns = allColumns.filter((column) => !isIgnoredImportColumn(column));
  const matchedByField = new Map();
  const duplicateColumns = [];
  const unexpectedColumns = [];

  for (const column of uploadedColumns) {
    const definition = findDefinitionForColumn(definitions, column);
    if (!definition) {
      unexpectedColumns.push(column);
      continue;
    }

    const match = {
      field: definition.field,
      expected: formatImportFieldLabel(definition),
      uploaded: column,
      aliases: definition.aliases,
    };

    if (matchedByField.has(definition.field)) {
      duplicateColumns.push(match);
    } else {
      matchedByField.set(definition.field, match);
    }
  }

  const missingColumns = definitions
    .filter((definition) => definition.required && !matchedByField.has(definition.field))
    .map(formatImportFieldLabel);
  const optionalMissingColumns = definitions
    .filter((definition) => !definition.required && !matchedByField.has(definition.field))
    .map(formatImportFieldLabel);

  return {
    isValid: missingColumns.length === 0 && unexpectedColumns.length === 0,
    expectedColumns: definitions.map(formatImportFieldLabel),
    uploadedColumns,
    ignoredColumns,
    matchedColumns: Array.from(matchedByField.values()),
    missingColumns,
    optionalMissingColumns,
    unexpectedColumns,
    duplicateColumns,
  };
}

export function mapImportRow(row = {}, fieldMap = {}) {
  const definitions = buildImportFieldDefinitions(fieldMap);
  const rowKeys = Object.keys(row);
  const mappedData = {};

  for (const definition of definitions) {
    const matchingKey = rowKeys.find((key) => (
      !isIgnoredImportColumn(key) &&
      definition.normalizedAliases.includes(normalizeImportColumnName(key))
    ));

    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== '') {
      let value = row[matchingKey];
      if (typeof value === 'number') value = String(value);
      mappedData[definition.field] = value;
    }
  }

  return mappedData;
}

export function getImportRequiredFieldLabels(fieldMap = {}) {
  return buildImportFieldDefinitions(fieldMap)
    .filter((definition) => definition.required)
    .map((definition) => ({
      field: definition.field,
      label: formatImportFieldLabel(definition),
    }));
}
