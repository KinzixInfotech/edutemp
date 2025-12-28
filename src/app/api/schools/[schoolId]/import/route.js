import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getAccountCredentialsEmailTemplate } from '@/lib/email';

// Supabase Admin client for creating auth users
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Modules that require Supabase account creation
const AUTH_MODULES = ['students', 'teachers', 'nonTeachingStaff', 'parents'];

// Field name mapping from template to database
const FIELD_MAPPINGS = {
    students: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Admission Number *': 'admissionNo',
        'Class Name *': 'className',
        'Section *': 'sectionName',
        'Gender *': 'gender',
        'Date of Birth (YYYY-MM-DD) *': 'dob',
        'Roll Number': 'rollNumber',
        'Contact Number': 'contactNumber',
        'Address': 'address',
        'City': 'city',
        'State': 'state',
        'Father Name': 'fatherName',
        'Mother Name': 'motherName',
        'Father Phone': 'fatherPhone',
        'Mother Phone': 'motherPhone',
        'Blood Group': 'bloodGroup',
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
        'Salary': 'salary',
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
        'Salary': 'salary',
    },
    parents: {
        'Full Name *': 'name',
        'Email *': 'email',
        'Phone Number *': 'phone',
        'Relation (Father/Mother/Guardian) *': 'relation',
        'Student Admission No *': 'studentAdmissionNo',
        'Address': 'address',
        'Occupation': 'occupation',
    },
    inventory: {
        'Item Name *': 'name',
        'Category *': 'category',
        'Quantity *': 'quantity',
        'Unit *': 'unit',
        'Cost Per Unit *': 'costPerUnit',
        'Minimum Quantity': 'minimumQuantity',
        'Storage Location': 'location',
        'Vendor Name': 'vendorName',
    },
    library: {
        'Book Title *': 'title',
        'Author *': 'author',
        'ISBN *': 'isbn',
        'Category *': 'category',
        'Publisher': 'publisher',
        'Published Year': 'publishedYear',
        'Number of Copies': 'copies',
    }
};

// POST: Import data from Excel file
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const formData = await req.formData();
        const file = formData.get('file');
        const module = formData.get('module');
        const retryIds = formData.get('retryIds'); // For retry functionality

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

        // Validate template columns match expected format
        const uploadedColumns = Object.keys(rawData[0]).filter(col => col !== 'S.No');
        const expectedColumns = Object.keys(expectedFields);
        const requiredColumns = expectedColumns.filter(col => col.includes('*'));

        // Check for missing required columns
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
                    suggestion: 'Please download the correct template and ensure all column headers match exactly.'
                }
            }, { status: 400 });
        }

        // Check for completely wrong format (no matching columns at all)
        const matchingColumns = expectedColumns.filter(expCol =>
            uploadedColumns.some(upCol => upCol.trim() === expCol.trim())
        );

        if (matchingColumns.length === 0) {
            return NextResponse.json({
                error: 'Template mapping not matched',
                details: {
                    message: 'The uploaded file appears to be for a different module or has incorrect format.',
                    expectedColumns: expectedColumns.slice(0, 5).map(c => c.replace(' *', '')),
                    uploadedColumns: uploadedColumns.slice(0, 5),
                    suggestion: `Please use the correct ${module} template.`
                }
            }, { status: 400 });
        }

        // Filter out empty rows (rows with only S.No or empty values)
        const data = rawData.filter(row => {
            const values = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined);
            return values.length > 1; // More than just S.No
        });

        if (data.length === 0) {
            return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
        }

        // Process based on module
        const results = {
            success: 0,
            failed: 0,
            errors: [],
            // New fields for Supabase account tracking
            accountsCreated: 0,
            accountsFailed: 0,
            accountErrors: [],
            requiresAuth: AUTH_MODULES.includes(module),
            totalRecords: data.length,
        };

        // Track created users for email sending
        const createdUsers = [];
        const schoolInfo = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true }
        });

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = row['S.No'] || (i + 2);

            try {
                const importResult = await processRow(module, row, schoolId, FIELD_MAPPINGS[module] || {});
                results.success++;

                // Track Supabase account creation for auth modules
                if (AUTH_MODULES.includes(module) && importResult) {
                    if (importResult.authSuccess) {
                        results.accountsCreated++;
                        // Save for email sending
                        createdUsers.push({
                            email: importResult.email,
                            name: importResult.name || row['Full Name *'],
                            password: importResult.defaultPassword,
                            userType: module === 'students' ? 'student' :
                                module === 'teachers' ? 'teacher' :
                                    module === 'nonTeachingStaff' ? 'staff' : 'parent'
                        });
                    } else if (importResult.authError) {
                        results.accountsFailed++;
                        results.accountErrors.push({
                            row: rowNumber,
                            email: importResult.email,
                            message: importResult.authError,
                            canRetry: true,
                            recordId: importResult.recordId,
                        });
                    }
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: rowNumber,
                    message: error.message,
                    data: { name: row['Full Name *'] || row['Item Name *'] || row['Book Title *'] }
                });
            }
        }

        // Save import history (get userId from formData)
        const importedBy = formData.get('userId');
        if (importedBy) {
            try {
                await prisma.importHistory.create({
                    data: {
                        schoolId,
                        module,
                        fileName: file.name,
                        totalRows: data.length,
                        success: results.success,
                        failed: results.failed,
                        accountsCreated: results.accountsCreated,
                        accountsFailed: results.accountsFailed,
                        importedBy,
                        errors: results.errors.length > 0 ? results.errors : null
                    }
                });
            } catch (historyError) {
                console.error('[IMPORT HISTORY ERROR]', historyError);
                // Continue even if history fails
            }
        } else {
            console.log('[IMPORT HISTORY] Skipped - no userId provided');
        }

        // Send credential emails asynchronously (don't block response)
        if (createdUsers.length > 0 && formData.get('sendEmails') === 'true') {
            const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com'}/login`;

            // Send emails in background
            Promise.all(createdUsers.map(async (user) => {
                try {
                    const emailTemplate = getAccountCredentialsEmailTemplate({
                        userName: user.name,
                        email: user.email,
                        password: user.password,
                        userType: user.userType,
                        schoolName: schoolInfo?.name || 'Your School',
                        loginUrl
                    });
                    await sendEmail({
                        to: user.email,
                        subject: emailTemplate.subject,
                        html: emailTemplate.html,
                        text: emailTemplate.text
                    });
                } catch (emailError) {
                    console.error(`[EMAIL ERROR] Failed to send to ${user.email}:`, emailError);
                }
            })).catch(console.error);

            results.emailsSent = createdUsers.length;
        }

        return NextResponse.json({
            message: 'Import completed',
            total: data.length,
            ...results
        });

    } catch (error) {
        console.error('[IMPORT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Retry failed Supabase account creations
export async function PATCH(req, { params }) {
    try {
        const { schoolId } = await params;
        const { records, module } = await req.json();

        if (!records || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: 'No records to retry' }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };

        for (const record of records) {
            try {
                const authResult = await createSupabaseAccount(record.email, record.password, record.recordId, module);

                if (authResult.success) {
                    // Update the user record with Supabase ID
                    await prisma.user.update({
                        where: { id: record.recordId },
                        data: { id: authResult.userId }
                    });
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        email: record.email,
                        message: authResult.error,
                        canRetry: true,
                        recordId: record.recordId,
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    email: record.email,
                    message: error.message,
                    canRetry: true,
                    recordId: record.recordId,
                });
            }
        }

        return NextResponse.json({
            message: 'Retry completed',
            ...results
        });

    } catch (error) {
        console.error('[RETRY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Create Supabase account
async function createSupabaseAccount(email, password) {
    try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        return { success: true, userId: authData.user.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Process individual row based on module
async function processRow(module, row, schoolId, fieldMap) {
    // Map Excel columns to database fields with type conversion
    const mappedData = {};
    for (const [excelCol, dbField] of Object.entries(fieldMap)) {
        if (row[excelCol] !== undefined && row[excelCol] !== '') {
            let value = row[excelCol];
            // Convert numbers to strings for text fields (Excel reads "10" as number 10)
            if (typeof value === 'number') {
                value = String(value);
            }
            mappedData[dbField] = value;
        }
    }

    switch (module) {
        case 'students':
            return await importStudent(mappedData, schoolId);
        case 'teachers':
            return await importTeacher(mappedData, schoolId);
        case 'nonTeachingStaff':
            return await importNonTeachingStaff(mappedData, schoolId);
        case 'parents':
            return await importParent(mappedData, schoolId);
        case 'inventory':
            return await importInventoryItem(mappedData, schoolId);
        case 'library':
            return await importLibraryBook(mappedData, schoolId);
        default:
            throw new Error(`Module '${module}' not implemented`);
    }
}

// Import student with Supabase account
async function importStudent(data, schoolId) {
    const { name, email, admissionNo, className, sectionName, gender, dob, ...rest } = data;

    if (!name || !email || !admissionNo || !className || !gender || !dob) {
        throw new Error('Missing required fields: name, email, admissionNo, className, gender, dob');
    }

    // Find class
    const existingClass = await prisma.class.findFirst({
        where: { schoolId, className },
        include: { sections: true }
    });

    if (!existingClass) {
        throw new Error(`Class '${className}' not found. Please create the class first.`);
    }

    // Find section
    const section = existingClass.sections.find(s =>
        s.name?.toLowerCase() === sectionName?.toLowerCase()
    );

    if (!section) {
        throw new Error(`Section '${sectionName}' not found in class '${className}'.`);
    }

    // Check if student already exists
    const existingStudent = await prisma.student.findFirst({
        where: { OR: [{ admissionNo }, { email }], schoolId }
    });

    if (existingStudent) {
        throw new Error(`Student with admission number '${admissionNo}' or email '${email}' already exists.`);
    }

    // Get student role (global table)
    const studentRole = await prisma.role.findFirst({
        where: { name: 'STUDENT' }
    });

    if (!studentRole) {
        throw new Error('Student role not found');
    }

    const defaultPassword = `Student@${admissionNo}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Generate UUID for user
    const userId = require('crypto').randomUUID();

    // Create DB records FIRST using transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create user record
        const user = await tx.user.create({
            data: {
                id: userId,
                name,
                email,
                password: hashedPassword,
                roleId: studentRole.id,
                gender: gender || 'Other',
                schoolId,
                status: 'ACTIVE'
            }
        });

        // Create student record
        await tx.student.create({
            data: {
                userId: user.id,
                name,
                email,
                admissionNo,
                classId: existingClass.id,
                sectionId: section.id,
                schoolId,
                gender: gender || 'Other',
                dob,
                rollNumber: rest.rollNumber || '',
                contactNumber: rest.contactNumber || '',
                Address: rest.address || '',
                city: rest.city || '',
                state: rest.state || '',
                country: 'India',
                postalCode: '',
                FatherName: rest.fatherName || '',
                MotherName: rest.motherName || '',
                FatherNumber: rest.fatherPhone || '',
                MotherNumber: rest.motherPhone || '',
                bloodGroup: rest.bloodGroup || '',
                admissionDate: new Date().toISOString().split('T')[0],
            }
        });

        return user;
    });

    // DB succeeded - now create Supabase account
    let authSuccess = false;
    let authError = null;

    const authResult = await createSupabaseAccount(email, defaultPassword);
    if (authResult.success) {
        authSuccess = true;
        // Update user with Supabase ID if different
        if (authResult.userId !== userId) {
            await prisma.user.update({
                where: { id: userId },
                data: { id: authResult.userId }
            }).catch(() => { }); // Ignore if update fails
        }
    } else {
        authError = authResult.error;
    }

    return { authSuccess, authError, email, recordId: result.id, name, defaultPassword };
}

// Import teacher with Supabase account
async function importTeacher(data, schoolId) {
    const { name, email, employeeId, gender, designation, ...rest } = data;

    if (!name || !email || !employeeId || !gender || !designation) {
        throw new Error('Missing required fields: name, email, employeeId, gender, designation');
    }

    // Check if teacher already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error(`User with email '${email}' already exists.`);
    }

    // Get teacher role (global table)
    const teacherRole = await prisma.role.findFirst({
        where: { name: 'TEACHING_STAFF' }
    });

    if (!teacherRole) {
        throw new Error('Teaching staff role not found');
    }

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
    });

    if (!academicYear) {
        throw new Error('No current academic year found. Please set up an academic year first.');
    }

    const defaultPassword = `Teacher@${employeeId}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const userId = require('crypto').randomUUID();

    // Create DB records FIRST using transaction
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: userId,
                name,
                email,
                password: hashedPassword,
                roleId: teacherRole.id,
                gender: gender || 'Other',
                schoolId,
                status: 'ACTIVE'
            }
        });

        await tx.teachingStaff.create({
            data: {
                userId: user.id,
                name,
                email,
                employeeId,
                designation,
                schoolId,
                academicYearId: academicYear.id,
                gender: gender || 'Other',
                age: rest.age || '0',
                bloodGroup: rest.bloodGroup || '',
                contactNumber: rest.phone || '',
                dob: rest.dob || '',
                address: rest.address || '',
                City: rest.city || '',
                district: rest.district || '',
                state: rest.state || '',
                country: rest.country || 'India',
                PostalCode: rest.postalCode || '',
            }
        });

        return user;
    });

    // DB succeeded - now create Supabase account
    let authSuccess = false;
    let authError = null;

    const authResult = await createSupabaseAccount(email, defaultPassword);
    if (authResult.success) {
        authSuccess = true;
    } else {
        authError = authResult.error;
    }

    return { authSuccess, authError, email, recordId: result.id, name, defaultPassword };
}

// Import non-teaching staff with Supabase account
async function importNonTeachingStaff(data, schoolId) {
    const { name, email, employeeId, gender, designation, department, ...rest } = data;

    if (!name || !email || !employeeId || !gender || !designation || !department) {
        throw new Error('Missing required fields: name, email, employeeId, gender, designation, department');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error(`User with email '${email}' already exists.`);
    }

    // Get non-teaching staff role (global table)
    const ntRole = await prisma.role.findFirst({
        where: { name: 'NON_TEACHING_STAFF' }
    });

    if (!ntRole) {
        throw new Error('Non-teaching staff role not found');
    }

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
    });

    if (!academicYear) {
        throw new Error('No current academic year found. Please set up an academic year first.');
    }

    // Handle Department (Find or Create)
    let departmentRecord = await prisma.department.findFirst({
        where: { name: department }
    });

    if (!departmentRecord) {
        try {
            departmentRecord = await prisma.department.create({
                data: { name: department }
            });
        } catch (error) {
            // Check if it failed due to race condition or unique constraint
            departmentRecord = await prisma.department.findFirst({
                where: { name: department }
            });

            if (!departmentRecord) {
                // Fallback if still null, though unlikely with serialized processing
                throw new Error(`Failed to create/find department: ${department}`);
            }
        }
    }

    const defaultPassword = `Staff@${employeeId}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const userId = require('crypto').randomUUID();

    // Create DB records FIRST using transaction
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: userId,
                name,
                email,
                password: hashedPassword,
                roleId: ntRole.id,
                gender: gender || 'Other',
                schoolId,
                status: 'ACTIVE'
            }
        });

        await tx.nonTeachingStaff.create({
            data: {
                userId: user.id,
                name,
                email,
                employeeId,
                designation,
                departmentId: departmentRecord.id,
                schoolId,
                academicYearId: academicYear.id,
                gender: gender || 'Other',
                age: rest.age || '0',
                bloodGroup: rest.bloodGroup || '',
                contactNumber: rest.phone || '',
                dob: rest.dob || '',
                address: rest.address || '',
                City: rest.city || '',
                district: rest.district || '',
                state: rest.state || '',
                country: rest.country || 'India',
                PostalCode: rest.postalCode || '',
            }
        });

        return user;
    });

    // DB succeeded - now create Supabase account
    let authSuccess = false;
    let authError = null;

    const authResult = await createSupabaseAccount(email, defaultPassword);
    if (authResult.success) {
        authSuccess = true;
    } else {
        authError = authResult.error;
    }

    return { authSuccess, authError, email, recordId: result.id, name, defaultPassword };
}

// Import parent with Supabase account
async function importParent(data, schoolId) {
    const { name, email, phone, relation, studentAdmissionNo, ...rest } = data;

    if (!name || !email || !phone || !relation || !studentAdmissionNo) {
        throw new Error('Missing required fields: name, email, phone, relation, studentAdmissionNo');
    }

    // Find the student
    const student = await prisma.student.findFirst({
        where: { schoolId, admissionNo: studentAdmissionNo }
    });

    if (!student) {
        throw new Error(`Student with admission number '${studentAdmissionNo}' not found.`);
    }

    // Check if parent already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error(`User with email '${email}' already exists.`);
    }

    // Get parent role (global table)
    const parentRole = await prisma.role.findFirst({
        where: { name: 'PARENT' }
    });

    if (!parentRole) {
        throw new Error('Parent role not found');
    }

    const defaultPassword = `Parent@${phone.slice(-4)}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const userId = require('crypto').randomUUID();

    // Create DB records FIRST using transaction
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: userId,
                name,
                email,
                password: hashedPassword,
                roleId: parentRole.id,
                schoolId,
                status: 'ACTIVE'
            }
        });

        await tx.parent.create({
            data: {
                userId: user.id,
                name,
                email,
                phone,
                relation,
                schoolId,
                address: rest.address || '',
                occupation: rest.occupation || '',
                students: {
                    connect: { id: student.id }
                }
            }
        });

        return user;
    });

    // DB succeeded - now create Supabase account
    let authSuccess = false;
    let authError = null;

    const authResult = await createSupabaseAccount(email, defaultPassword);
    if (authResult.success) {
        authSuccess = true;
    } else {
        authError = authResult.error;
    }

    return { authSuccess, authError, email, recordId: result.id, name, defaultPassword };
}

// Import inventory item (no auth needed)
async function importInventoryItem(data, schoolId) {
    const { name, category, quantity, unit, costPerUnit, ...rest } = data;

    if (!name || !category || !quantity || !unit || !costPerUnit) {
        throw new Error('Missing required fields: name, category, quantity, unit, costPerUnit');
    }

    let inventoryCategory = await prisma.inventoryCategory.findFirst({
        where: { schoolId, name: category }
    });

    if (!inventoryCategory) {
        inventoryCategory = await prisma.inventoryCategory.create({
            data: { schoolId, name: category }
        });
    }

    await prisma.inventoryItem.create({
        data: {
            name,
            category,
            categoryId: inventoryCategory.id,
            schoolId,
            quantity: parseInt(quantity),
            unit,
            costPerUnit: parseFloat(costPerUnit),
            minimumQuantity: rest.minimumQuantity ? parseInt(rest.minimumQuantity) : 10,
            maximumQuantity: 1000,
            location: rest.location || 'Default',
            vendorName: rest.vendorName || 'Unknown',
            vendorContact: '',
            purchaseDate: new Date(),
            status: 'ACTIVE'
        }
    });

    return { authSuccess: null }; // No auth for inventory
}

// Import library book (no auth needed)
async function importLibraryBook(data, schoolId) {
    const { title, author, isbn, category, ...rest } = data;

    if (!title || !author || !isbn || !category) {
        throw new Error('Missing required fields: title, author, isbn, category');
    }

    const existing = await prisma.libraryBook.findFirst({
        where: { schoolId, ISBN: isbn }
    });

    if (existing) {
        throw new Error(`Book with ISBN '${isbn}' already exists.`);
    }

    await prisma.libraryBook.create({
        data: {
            title,
            author,
            ISBN: isbn,
            category,
            schoolId,
            publisher: rest.publisher || '',
            edition: rest.edition || null,
            description: rest.description || null,
        }
    });

    return { authSuccess: null }; // No auth for library
}
