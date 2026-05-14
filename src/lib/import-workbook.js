import * as XLSX from 'xlsx';
import {
  analyzeImportHeaders,
  isIgnoredImportColumn,
} from '@/lib/import-column-mapping';

export function getMeaningfulImportRows(rawData = []) {
  return rawData.filter((row) => {
    const meaningfulValues = Object.entries(row)
      .filter(([key]) => !isIgnoredImportColumn(key))
      .map(([, value]) => String(value ?? '').trim())
      .filter(Boolean);
    return meaningfulValues.length > 0;
  });
}

function summarizeWorksheetCandidate(candidate) {
  return {
    sheetName: candidate.sheetName,
    rowCount: candidate.rows.length,
    rawRowCount: candidate.rawData.length,
    isValid: Boolean(candidate.headerAnalysis.isValid),
    matchedColumns: candidate.headerAnalysis.matchedColumns || [],
    missingColumns: candidate.headerAnalysis.missingColumns || [],
    unexpectedColumns: candidate.headerAnalysis.unexpectedColumns || [],
  };
}

export function readImportWorksheetRows(workbook, expectedFields = {}, options = {}) {
  const candidates = workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const headerAnalysis = analyzeImportHeaders(Object.keys(rawData[0] || {}), expectedFields);
    const rows = getMeaningfulImportRows(rawData);

    return {
      sheetName,
      rawData,
      rows,
      headerAnalysis,
      score: (headerAnalysis.matchedColumns?.length || 0) * 1000 + rows.length - index,
    };
  });

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.headerAnalysis.isValid !== b.headerAnalysis.isValid) {
      return a.headerAnalysis.isValid ? -1 : 1;
    }
    return b.score - a.score;
  });

  const requestedSheetName = String(options.sheetName || '').trim();
  const selected = requestedSheetName
    ? candidates.find((candidate) => candidate.sheetName === requestedSheetName)
    : sortedCandidates[0];

  const fallback = {
    sheetName: workbook.SheetNames[0],
    rawData: [],
    rows: [],
    headerAnalysis: analyzeImportHeaders([], expectedFields),
    score: 0,
  };

  return {
    ...(selected || fallback),
    sheets: candidates.map(summarizeWorksheetCandidate),
    requestedSheetName: requestedSheetName || null,
  };
}
