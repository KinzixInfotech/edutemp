import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import {
  getImportRequiredFieldLabels,
  mapImportRow,
} from '@/lib/import-column-mapping';
import { readImportWorksheetRows } from '@/lib/import-workbook';
import {
  resolveStudentImportRow,
  summarizeUnresolvedClasses,
} from '@/lib/student-import-normalization';

// Field mappings for each module - MUST match labels from template/route.js exactly
const FIELD_MAPPINGS = {
  students: {
    'Full Name *': 'name',
    'Email': 'email',
    'Email (Optional)': 'email',
    'Admission Number': 'admissionNo',
    'Student ID': 'admissionNo',
    'Admission Date': 'admissionDate',
    'Admission Date (YYYY-MM-DD)': 'admissionDate',
    'Joining Date': 'admissionDate',
    'Joining Date (YYYY-MM-DD)': 'admissionDate',
    'Date of Admission': 'admissionDate',
    'Class Name': 'className',
    'Class Name *': 'className',
    'Section': 'sectionName',
    'Section *': 'sectionName',
    'Gender *': 'gender',
    'Date of Birth (YYYY-MM-DD) *': 'dob',
    'Religion': 'religion',
    'Roll Number': 'rollNumber',
    'Contact Number': 'contactNumber',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'Father Name': 'fatherName',
    'Mother Name': 'motherName',
    'Father Phone': 'fatherPhone',
    'Mother Phone': 'motherPhone',
    'Blood Group': 'bloodGroup'
  },
  teachers: {
    'Full Name *': 'name',
    'Email *': 'email',
    'Employee ID *': 'employeeId',
    'Gender *': 'gender',
    'Designation *': 'designation',
    'Phone Number': 'phone',
    'Address': 'address',
    'Qualification': 'qualification',
    'Subjects (comma separated)': 'subjects',
    'Joining Date (YYYY-MM-DD)': 'joiningDate',
    'Salary': 'salary'
  },
  nonTeachingStaff: {
    'Full Name *': 'name',
    'Email *': 'email',
    'Employee ID *': 'employeeId',
    'Gender *': 'gender',
    'Designation *': 'designation',
    'Department *': 'department',
    'Phone Number': 'phone',
    'Address': 'address',
    'Joining Date (YYYY-MM-DD)': 'joiningDate',
    'Salary': 'salary'
  },
  parents: {
    'Full Name *': 'name',
    'Email': 'email',
    'Email (Optional)': 'email',
    'Phone Number': 'phone',
    'Relation (Father/Mother/Guardian) *': 'relation',
    'Student Admission No *': 'studentAdmissionNo',
    'Student ID *': 'studentAdmissionNo',
    'Address': 'address',
    'Occupation': 'occupation'
  },
  inventory: {
    'Item Name *': 'name',
    'Category *': 'category',
    'Quantity *': 'quantity',
    'Unit *': 'unit',
    'Cost Per Unit *': 'costPerUnit',
    'Minimum Quantity': 'minimumQuantity',
    'Storage Location': 'location',
    'Vendor Name': 'vendorName'
  },
  library: {
    'Book Title *': 'title',
    'Author *': 'author',
    'ISBN *': 'isbn',
    'Category *': 'category',
    'Publisher': 'publisher',
    'Published Year': 'publishedYear',
    'Number of Copies': 'copies'
  }
};

// Modules that require authentication accounts
const AUTH_MODULES = ['students', 'teachers', 'nonTeachingStaff'];

function normalizeStudentReligion(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const map = {
    hindu: 'HINDU',
    hinduism: 'HINDU',
    muslim: 'MUSLIM',
    islam: 'MUSLIM',
    christian: 'CHRISTIAN',
    christianity: 'CHRISTIAN',
    sikh: 'SIKH',
    sikhism: 'SIKH',
    buddhist: 'BUDDHIST',
    buddhism: 'BUDDHIST',
    jain: 'JAIN',
    jainism: 'JAIN',
    parsi: 'PARSI',
    zoroastrian: 'PARSI',
    jewish: 'JEWISH',
    judaism: 'JEWISH',
    other: 'OTHER',
    'prefer not to say': 'PREFER_NOT_TO_SAY',
    'prefer_not_to_say': 'PREFER_NOT_TO_SAY'
  };

  return map[normalized] || null;
}

// POST: Preview uploaded Excel file
export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const formData = await req.formData();
    const file = formData.get('file');
    const moduleKey = formData.get('module');

    if (!file || !moduleKey) {
      return NextResponse.json({ error: 'File and module are required' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    // Get expected columns for this module
    const expectedFields = FIELD_MAPPINGS[moduleKey];
    if (!expectedFields) {
      return NextResponse.json({ error: `Module '${moduleKey}' not supported` }, { status: 400 });
    }

    const { sheetName, rawData, rows: data, headerAnalysis } = readImportWorksheetRows(workbook, expectedFields);

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in the file' }, { status: 400 });
    }

    // Validate template columns using flexible matching
    if (!headerAnalysis.isValid) {
      return NextResponse.json({
        error: 'Template mapping not matched',
        details: {
          message: 'The uploaded file does not match the expected template format.',
          ...headerAnalysis,
          suggestion: 'Fix the missing or unrecognized headers shown above, or download the latest template for this module.'
        }
      }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
    }

    const classes = moduleKey === 'students'
      ? await prisma.class.findMany({
        where: { schoolId },
        select: {
          id: true,
          className: true,
          sections: { select: { id: true, name: true } }
        },
        orderBy: { id: 'asc' }
      })
      : [];

    // Check for duplicates in database
    const duplicateInfo = await checkForDuplicates(moduleKey, data, schoolId, expectedFields);

    // Process each row for preview with validation
    const previewRows = data.map((row, index) => {
      // Map Excel columns to database fields using flexible matching
      let mappedData = mapImportRow(row, expectedFields);
      if (mappedData.religion) mappedData.religion = normalizeStudentReligion(mappedData.religion) || mappedData.religion;

      // Validate required fields
      const errors = [];
      const warnings = [];
      const requiredFields = getImportRequiredFieldLabels(expectedFields);

      if (moduleKey === 'students') {
        const resolved = resolveStudentImportRow(mappedData, classes);
        mappedData = resolved.data;
        errors.push(...resolved.errors);
        warnings.push(...resolved.warnings);
      } else {
        for (const { field, label } of requiredFields) {
          if (!mappedData[field] || mappedData[field] === '') {
          errors.push(`Missing required field: ${label}`);
          }
        }
      }

      // Check if this row is a duplicate
      const isDuplicate = duplicateInfo.duplicates.some((d) => d.rowIndex === index);
      const duplicateReason = duplicateInfo.duplicates.find((d) => d.rowIndex === index)?.reason;

      return {
        rowNumber: index + 1,
        data: mappedData,
        rawData: row,
        isValid: errors.length === 0,
        errors,
        warnings,
        isDuplicate,
        duplicateReason,
        rawClassName: moduleKey === 'students' ? (mapImportRow(row, expectedFields).className || '') : undefined
      };
    });

    // Summary
    const validCount = previewRows.filter((r) => r.isValid && !r.isDuplicate).length;
    const invalidCount = previewRows.filter((r) => !r.isValid).length;
    const duplicateCount = previewRows.filter((r) => r.isDuplicate).length;

    return NextResponse.json({
      fileName: file.name,
      sheetName,
      module: moduleKey,
      totalRows: previewRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      requiresAuth: AUTH_MODULES.includes(moduleKey),
      rows: previewRows,
      columns: Array.from(new Set(Object.values(expectedFields))),
      classResolution: moduleKey === 'students' ? {
        unresolved: summarizeUnresolvedClasses(previewRows),
        options: classes.map((cls) => ({ id: cls.id, className: cls.className }))
      } : null
    });

  } catch (error) {
    console.error('[PREVIEW ERROR]', error);

    // Sanitize error message for users - don't expose internal details
    let userFriendlyError = 'An error occurred while processing your file. Please try again.';

    if (error.message?.includes('No data found')) {
      userFriendlyError = 'The uploaded file appears to be empty. Please check your data.';
    } else if (error.message?.includes('not supported')) {
      userFriendlyError = error.message;
    } else if (error.message?.includes('Template mapping')) {
      userFriendlyError = error.message;
    } else if (error.code === 'P2002') {
      userFriendlyError = 'Duplicate entry found in database.';
    } else if (error.name === 'PrismaClientValidationError') {
      userFriendlyError = 'There was an issue processing your data. Please ensure the template format is correct.';
    }

    return NextResponse.json({ error: userFriendlyError }, { status: 500 });
  }
});

// Check for duplicate records in database
async function checkForDuplicates(module, data, schoolId, fieldMap) {
  const duplicates = [];

  // Helper function to normalize column names for flexible matching
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mappedData = mapImportRow(row, fieldMap);

    let existingRecord = null;
    let reason = '';

    switch (module) {
      case 'students':
        if (mappedData.email) {
          existingRecord = await prisma.student.findFirst({
            where: { schoolId, OR: [{ email: mappedData.email }, { admissionNo: mappedData.admissionNo }] }
          });
          if (existingRecord) {
            reason = existingRecord.email === mappedData.email ?
            `Email already exists: ${mappedData.email}` :
            `Admission No already exists: ${mappedData.admissionNo}`;
          }
        }
        break;

      case 'teachers':
      case 'nonTeachingStaff':
        if (mappedData.email) {
          existingRecord = await prisma.user.findUnique({ where: { email: mappedData.email } });
          if (existingRecord) reason = `Email already exists: ${mappedData.email}`;
        }
        break;

      case 'parents':
        if (mappedData.phone || mappedData.email) {
          existingRecord = await prisma.parent.findFirst({
            where: {
              schoolId,
              OR: [
                ...(mappedData.phone ? [{ contactNumber: mappedData.phone }] : []),
                ...(mappedData.email ? [{ email: mappedData.email }] : []),
              ],
            }
          });
          if (existingRecord) {
            reason = mappedData.phone && existingRecord.contactNumber === mappedData.phone
              ? `Parent phone already exists: ${mappedData.phone}`
              : `Parent email already exists: ${mappedData.email}`;
          }
        }
        break;

      case 'inventory':
        if (mappedData.name) {
          existingRecord = await prisma.inventoryItem.findFirst({
            where: { schoolId, name: mappedData.name }
          });
          if (existingRecord) reason = `Item already exists: ${mappedData.name}`;
        }
        break;

      case 'library':
        if (mappedData.isbn) {
          existingRecord = await prisma.libraryBook.findFirst({
            where: { schoolId, ISBN: mappedData.isbn }
          });
          if (existingRecord) reason = `Book with ISBN already exists: ${mappedData.isbn}`;
        }
        break;
    }

    if (existingRecord) {
      duplicates.push({ rowIndex: i, reason });
    }
  }

  return { duplicates, count: duplicates.length };
}
