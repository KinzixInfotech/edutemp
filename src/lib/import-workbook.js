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

export function readImportWorksheetRows(workbook, expectedFields = {}) {
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

  candidates.sort((a, b) => {
    if (a.headerAnalysis.isValid !== b.headerAnalysis.isValid) {
      return a.headerAnalysis.isValid ? -1 : 1;
    }
    return b.score - a.score;
  });

  const selected = candidates[0] || {
    sheetName: workbook.SheetNames[0],
    rawData: [],
    rows: [],
    headerAnalysis: analyzeImportHeaders([], expectedFields),
  };

  return selected;
}
