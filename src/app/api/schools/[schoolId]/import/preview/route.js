import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';

// Field mappings for each module
const FIELD_MAPPINGS = {
    students: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Admission Number *': 'admissionNo',
        'Class Name *': 'className',
        'Section *': 'sectionName',
        'Gender *': 'gender',
        'Date of Birth *': 'dob',
        'Roll Number': 'rollNumber',
        'Contact Number': 'contactNumber',
        'Address': 'address',
        'City': 'city',
        'State': 'state',
        'Father Name': 'fatherName',
        'Father Phone': 'fatherPhone',
        'Mother Name': 'motherName',
        'Mother Phone': 'motherPhone',
        'Blood Group': 'bloodGroup'
    },
    teachers: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Employee ID *': 'employeeId',
        'Gender *': 'gender',
        'Designation *': 'designation',
        'Phone': 'phone',
        'Qualification': 'qualification',
        'Joining Date': 'joiningDate',
        'Salary': 'salary'
    },
    nonTeachingStaff: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Employee ID *': 'employeeId',
        'Gender *': 'gender',
        'Designation *': 'designation',
        'Department *': 'department',
        'Phone': 'phone',
        'Joining Date': 'joiningDate',
        'Salary': 'salary'
    },
    parents: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Phone *': 'phone',
        'Relation *': 'relation',
        'Student Admission No *': 'studentAdmissionNo',
        'Address': 'address',
        'Occupation': 'occupation'
    },
    inventory: {
        'Item Name *': 'name',
        'Category *': 'category',
        'Quantity *': 'quantity',
        'Unit *': 'unit',
        'Cost Per Unit *': 'costPerUnit',
        'Location': 'location',
        'Vendor Name': 'vendorName'
    },
    library: {
        'Book Title *': 'title',
        'Author *': 'author',
        'ISBN *': 'isbn',
        'Category *': 'category',
        'Published Year': 'publishedYear',
        'Number of Copies': 'copies'
    }
};

// Modules that require authentication accounts
const AUTH_MODULES = ['students', 'teachers', 'nonTeachingStaff', 'parents'];

// POST: Preview uploaded Excel file
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const formData = await req.formData();
        const file = formData.get('file');
        const module = formData.get('module');

        if (!file || !module) {
            return NextResponse.json({ error: 'File and module are required' }, { status: 400 });
        }

        // Read file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Parse Excel file
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(s => s === 'Data') || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: 'No data found in the file' }, { status: 400 });
        }

        // Get expected columns for this module
        const expectedFields = FIELD_MAPPINGS[module];
        if (!expectedFields) {
            return NextResponse.json({ error: `Module '${module}' not supported` }, { status: 400 });
        }

        // Validate template columns
        const uploadedColumns = Object.keys(rawData[0]).filter(col => col !== 'S.No');
        const expectedColumns = Object.keys(expectedFields);
        const requiredColumns = expectedColumns.filter(col => col.includes('*'));

        const missingRequired = requiredColumns.filter(reqCol =>
            !uploadedColumns.some(upCol => upCol.trim() === reqCol.trim())
        );

        if (missingRequired.length > 0) {
            return NextResponse.json({
                error: 'Template mapping not matched',
                details: {
                    message: 'The uploaded file does not match the expected template format.',
                    missingColumns: missingRequired,
                    expectedColumns: expectedColumns,
                    uploadedColumns: uploadedColumns,
                    suggestion: 'Please download the correct template.'
                }
            }, { status: 400 });
        }

        // Filter out empty rows
        const data = rawData.filter(row => {
            const values = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined);
            return values.length > 1;
        });

        if (data.length === 0) {
            return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
        }

        // Check for duplicates in database
        const duplicateInfo = await checkForDuplicates(module, data, schoolId, expectedFields);

        // Process each row for preview with validation
        const previewRows = data.map((row, index) => {
            // Map Excel columns to database fields
            const mappedData = {};
            for (const [excelCol, dbField] of Object.entries(expectedFields)) {
                if (row[excelCol] !== undefined && row[excelCol] !== '') {
                    let value = row[excelCol];
                    if (typeof value === 'number') value = String(value);
                    mappedData[dbField] = value;
                }
            }

            // Validate required fields
            const errors = [];
            const requiredFieldKeys = Object.entries(expectedFields)
                .filter(([col]) => col.includes('*'))
                .map(([, field]) => field);

            for (const field of requiredFieldKeys) {
                if (!mappedData[field] || mappedData[field] === '') {
                    errors.push(`Missing required field: ${field}`);
                }
            }

            // Check if this row is a duplicate
            const isDuplicate = duplicateInfo.duplicates.some(d => d.rowIndex === index);
            const duplicateReason = duplicateInfo.duplicates.find(d => d.rowIndex === index)?.reason;

            return {
                rowNumber: index + 1,
                data: mappedData,
                rawData: row,
                isValid: errors.length === 0,
                errors,
                isDuplicate,
                duplicateReason
            };
        });

        // Summary
        const validCount = previewRows.filter(r => r.isValid && !r.isDuplicate).length;
        const invalidCount = previewRows.filter(r => !r.isValid).length;
        const duplicateCount = previewRows.filter(r => r.isDuplicate).length;

        return NextResponse.json({
            fileName: file.name,
            module,
            totalRows: previewRows.length,
            validRows: validCount,
            invalidRows: invalidCount,
            duplicateRows: duplicateCount,
            requiresAuth: AUTH_MODULES.includes(module),
            rows: previewRows,
            columns: Object.values(expectedFields)
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
}

// Check for duplicate records in database
async function checkForDuplicates(module, data, schoolId, fieldMap) {
    const duplicates = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Map row to fields
        const mappedData = {};
        for (const [excelCol, dbField] of Object.entries(fieldMap)) {
            if (row[excelCol] !== undefined && row[excelCol] !== '') {
                let value = row[excelCol];
                if (typeof value === 'number') value = String(value);
                mappedData[dbField] = value;
            }
        }

        let existingRecord = null;
        let reason = '';

        switch (module) {
            case 'students':
                if (mappedData.email) {
                    existingRecord = await prisma.student.findFirst({
                        where: { schoolId, OR: [{ email: mappedData.email }, { admissionNo: mappedData.admissionNo }] }
                    });
                    if (existingRecord) {
                        reason = existingRecord.email === mappedData.email
                            ? `Email already exists: ${mappedData.email}`
                            : `Admission No already exists: ${mappedData.admissionNo}`;
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
                if (mappedData.email) {
                    existingRecord = await prisma.parent.findFirst({
                        where: { schoolId, email: mappedData.email }
                    });
                    if (existingRecord) reason = `Parent email already exists: ${mappedData.email}`;
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
