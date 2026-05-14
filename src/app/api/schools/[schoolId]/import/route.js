import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getAccountCredentialsEmailTemplate } from '@/lib/email';
import {
  buildMissingContactPlaceholder,
  generateNextStudentId,
  getSchoolIdentityContext,
  resolveParentAccountIdentity,
  resolveStudentAccountIdentity,
} from '@/lib/profile-auth';
import { buildParentAuthEmail, buildParentPlaceholderAuthEmail, normalizePhoneNumber, normalizeStudentIdentifier } from '@/lib/auth-identifiers';
import {
  mapImportRow,
} from '@/lib/import-column-mapping';
import { readImportWorksheetRows } from '@/lib/import-workbook';
import { resolveStudentImportRow } from '@/lib/student-import-normalization';

// Supabase Admin client for creating auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Modules that require Supabase account creation
export const AUTH_MODULES = ['students', 'teachers', 'nonTeachingStaff'];

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

function parseClassMappings(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Field name mapping from template to database
export const FIELD_MAPPINGS = {
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

// POST: Import data from Excel file
export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const formData = await req.formData();
    const file = formData.get('file');
    const moduleKey = formData.get('module');
    const retryIds = formData.get('retryIds'); // For retry functionality
    const requestedSheetName = String(formData.get('sheetName') || '').trim();
    const classMappings = parseClassMappings(formData.get('classMappings'));
    const sectionMappings = parseClassMappings(formData.get('sectionMappings'));

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

    const { rawData, rows: data, headerAnalysis } = readImportWorksheetRows(workbook, expectedFields, {
      sheetName: requestedSheetName,
    });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in the file' }, { status: 400 });
    }

    // Validate template columns match expected format
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

    // Check for completely wrong format (no matching columns at all)
    if (headerAnalysis.matchedColumns.length === 0) {
      return NextResponse.json({
        error: 'Template mapping not matched',
        details: {
          message: 'The uploaded file appears to be for a different module or has incorrect format.',
          ...headerAnalysis,
          suggestion: `Please use the correct ${moduleKey} template.`
        }
      }, { status: 400 });
    }

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
      requiresAuth: AUTH_MODULES.includes(moduleKey),
      totalRecords: data.length,
      importedWithWarnings: 0,
      missingJoiningDate: 0
    };

    // Track created users for email sending
    const createdUsers = [];
    const schoolInfo = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = row['S.No'] || i + 2;

      try {
        const importResult = await processRow(moduleKey, row, schoolId, FIELD_MAPPINGS[moduleKey] || {}, {
          academicYearId: String(formData.get('academicYearId') || '').trim() || null,
          classMappings,
          sectionMappings,
        });
        results.success++;
        if (importResult?.warnings?.length) results.importedWithWarnings++;
        if (importResult?.missingJoiningDate) results.missingJoiningDate++;

        // Track Supabase account creation for auth modules
        if (AUTH_MODULES.includes(moduleKey) && importResult) {
          if (importResult.authSuccess) {
            results.accountsCreated++;
            // Save for email sending
            createdUsers.push({
              email: importResult.deliveryEmail || null,
              internalEmail: importResult.email || null,
              visibleEmail: importResult.deliveryEmail || null,
              loginValue: importResult.loginValue,
              loginLabel: importResult.loginLabel,
              name: importResult.name || row['Full Name *'],
              password: importResult.defaultPassword,
              className: importResult.className || null,
              sectionName: importResult.sectionName || null,
              missingJoiningDate: Boolean(importResult.missingJoiningDate),
              userType: moduleKey === 'students' ? 'student' :
              moduleKey === 'teachers' ? 'teacher' :
              moduleKey === 'nonTeachingStaff' ? 'staff' : 'parent'
            });
          } else if (importResult.authError) {
            results.accountsFailed++;
            results.accountErrors.push({
              row: rowNumber,
              loginValue: importResult.loginValue || importResult.email,
              loginLabel: importResult.loginLabel || 'Login',
              message: importResult.authError,
              canRetry: true,
              recordId: importResult.recordId
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
            module: moduleKey,
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
        if (!user.email) {
          return;
        }

        try {
          const emailTemplate = getAccountCredentialsEmailTemplate({
            userName: user.name,
            email: user.email,
            password: user.password,
            userType: user.userType,
            schoolName: schoolInfo?.name || 'Your School',
            loginUrl,
            loginLabel: user.loginLabel,
            loginValue: user.loginValue,
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
      ...results,
      failedRows: results.errors.map((entry) => ({
        row: entry.row,
        reason: entry.message,
        data: entry.data,
      })),
      // Include credentials for export (only if accounts were created)
      credentials: createdUsers.length > 0 ? createdUsers.map((u) => ({
        name: u.name,
        email: u.email,
        internalEmail: u.internalEmail,
        visibleEmail: u.visibleEmail,
        loginLabel: u.loginLabel,
        loginValue: u.loginValue,
        password: u.password,
        userType: u.userType,
        className: u.className || null,
        sectionName: u.sectionName || null,
      })) : []
    });

  } catch (error) {
    console.error('[IMPORT ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// Retry failed Supabase account creations
export const PATCH = withSchoolAccess(async function PATCH(req, { params }) {
  try {
    const { schoolId } = await params;
    const { records, module } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records to retry' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const record of records) {
      try {
        const authResult = await createSupabaseAccount(record.email, record.password, record.recordId, { role: module });

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
            recordId: record.recordId
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: record.email,
          message: error.message,
          canRetry: true,
          recordId: record.recordId
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
});

// Create Supabase account
async function createSupabaseAccount(email, password, userId = undefined, metadata = {}) {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      ...(userId ? { id: userId } : {}),
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
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
export async function processRow(module, row, schoolId, fieldMap, options = {}) {
  // Map Excel columns to database fields with type conversion using flexible matching
  const mappedData = mapImportRow(row, fieldMap);
  if (mappedData.religion) mappedData.religion = normalizeStudentReligion(mappedData.religion) || mappedData.religion;

  switch (module) {
    case 'students':
      return await importStudent(mappedData, schoolId, options);
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
async function importStudent(data, schoolId, options = {}) {
  const { name, email, admissionNo, className, sectionName, gender, dob, ...rest } = data;

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: true },
    orderBy: { id: 'asc' }
  });
  const resolved = resolveStudentImportRow(
    { name, email, admissionNo, className, sectionName, gender, dob, ...rest },
    classes,
    options.classMappings || {},
    options.sectionMappings || {}
  );

  if (resolved.errors.length > 0) {
    throw new Error(resolved.errors.join('; '));
  }
  const normalizedData = resolved.data;
  const existingClass = resolved.resolvedClass || null;
  const section = existingClass?.sections?.find((item) => item.id === normalizedData.sectionId) || null;

  // Check if student already exists
  const studentId = normalizeStudentIdentifier(normalizedData.admissionNo) || await generateNextStudentId({ schoolId });
  const { authEmail, externalEmail } = await resolveStudentAccountIdentity({
    schoolId,
    studentId,
    externalEmail: normalizedData.email,
  });

  const existingStudent = await prisma.student.findFirst({
    where: { OR: [{ admissionNo: studentId }, { email: authEmail }, ...(externalEmail ? [{ email: externalEmail }] : [])], schoolId }
  });

  if (existingStudent) {
    throw new Error(`Student with ID '${studentId}' already exists.`);
  }

  // Get or create student role (global table)
  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT' }
  });

  const defaultPassword = `Student@${studentId}`;
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Generate UUID for user
  const userId = require('crypto').randomUUID();

  // Get active academic year for session binding
  const activeYear = await prisma.academicYear.findFirst({
    where: options.academicYearId ? { id: options.academicYearId, schoolId } : { schoolId, isActive: true },
    select: { id: true }
  });

  // Create DB records FIRST using transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user record
    const user = await tx.user.create({
      data: {
        id: userId,
        name: normalizedData.name,
        email: authEmail,
        password: hashedPassword,
        roleId: studentRole.id,
        gender: normalizedData.gender || 'Other',
        schoolId,
        status: 'ACTIVE'
      }
    });

    // Create student record
    await tx.student.create({
      data: {
        userId: user.id,
        name: normalizedData.name,
        email: externalEmail || authEmail,
        admissionNo: studentId,
        classId: existingClass?.id || null,
        sectionId: section?.id || null,
        schoolId,
        gender: normalizedData.gender || 'Other',
        religion: normalizeStudentReligion(normalizedData.religion) || null,
        dob: normalizedData.dob,
        rollNumber: normalizedData.rollNumber || '',
        contactNumber: normalizedData.contactNumber || '',
        Address: normalizedData.address || '',
        city: normalizedData.city || '',
        state: normalizedData.state || '',
        country: 'India',
        postalCode: '',
        FatherName: normalizedData.fatherName || '',
        MotherName: normalizedData.motherName || '',
        FatherNumber: normalizedData.fatherPhone || '',
        MotherNumber: normalizedData.motherPhone || '',
        bloodGroup: normalizedData.bloodGroup || '',
        admissionDate: normalizedData.admissionDate || null,
        missingJoiningDate: Boolean(normalizedData.missingJoiningDate),
        profileStatus: normalizedData.profileStatus || (normalizedData.admissionDate ? 'ACTIVE' : 'MISSING_JOIN_DATE'),
        ...(activeYear && { academicYearId: activeYear.id })
      }
    });

    // Create StudentSession + set currentSessionId
    if (activeYear?.id && existingClass?.id && section?.id) {
      const session = await tx.studentSession.create({
        data: {
          studentId: user.id,
          academicYearId: activeYear.id,
          classId: existingClass.id,
          sectionId: section.id,
          rollNumber: normalizedData.rollNumber || '',
          status: 'ACTIVE'
        }
      });
      await tx.student.update({
        where: { userId: user.id },
        data: { currentSessionId: session.id }
      });
    }

    const parentRole = await tx.role.upsert({
      where: { name: 'PARENT' },
      update: {},
      create: { name: 'PARENT' }
    });

    const parentName = normalizedData.fatherName || normalizedData.motherName || normalizedData.guardianName || `Guardian of ${normalizedData.name}`;
    const parentPhone = normalizedData.fatherPhone || normalizedData.motherPhone || '';
    const parentPhoneNormalized = normalizePhoneNumber(parentPhone);
    const parentPlaceholder = buildMissingContactPlaceholder({ schoolId, admissionNumber: studentId });
    const school = await getSchoolIdentityContext(schoolId, tx);
    const parentContactNumber = parentPhoneNormalized || parentPlaceholder;
    const parentEmail = parentPhoneNormalized
      ? buildParentAuthEmail({ phone: parentPhoneNormalized, school })
      : buildParentPlaceholderAuthEmail({ schoolId, admissionNumber: studentId, school });

    let parent = parentPhoneNormalized
      ? await tx.parent.findFirst({
        where: { schoolId, contactNumber: parentPhoneNormalized },
        include: { user: true },
      })
      : null;

    if (!parent) {
      const parentUser = await tx.user.create({
        data: {
          id: require('crypto').randomUUID(),
          name: parentName,
          email: parentEmail,
          password: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
          roleId: parentRole.id,
          gender: 'Unknown',
          schoolId,
          status: 'INACTIVE'
        }
      });

      parent = await tx.parent.create({
        data: {
          userId: parentUser.id,
          name: parentName,
          email: parentEmail,
          contactNumber: parentContactNumber,
          alternateNumber: parentPhoneNormalized ? null : parentPhone || null,
          schoolId,
          address: normalizedData.address || null
        }
      });
    }

    await tx.studentParentLink.create({
      data: {
        studentId: user.id,
        parentId: parent.id,
        relation: normalizedData.fatherName ? 'FATHER' : normalizedData.motherName ? 'MOTHER' : 'GUARDIAN',
        isPrimary: true
      }
    });

    return user;
  });

  let authSuccess = false;
  let authError = null;
  const authResult = await createSupabaseAccount(authEmail, defaultPassword, result.id, {
    name: normalizedData.name,
    role: 'student',
  });
  if (authResult.success) {
    authSuccess = true;
  } else {
    authError = authResult.error;
  }

  return {
    authSuccess,
    authError,
    appAccessPending: !authSuccess,
    email: authEmail,
    deliveryEmail: externalEmail,
    loginLabel: "Admission Number",
    loginValue: studentId,
    recordId: result.id,
    name: normalizedData.name,
    defaultPassword,
    className: existingClass?.className || '',
    sectionName: section?.name || '',
    missingJoiningDate: Boolean(normalizedData.missingJoiningDate),
    warnings: normalizedData.missingJoiningDate
      ? ['Missing joining/admission date. Fee assignment is blocked until assigned.']
      : [],
  };
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

  // Get or create teacher role (global table)
  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHING_STAFF' },
    update: {},
    create: { name: 'TEACHING_STAFF' }
  });

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
        PostalCode: rest.postalCode || ''
      }
    });

    return user;
  });

  // DB succeeded - now create Supabase account
  let authSuccess = false;
  let authError = null;

  const authResult = await createSupabaseAccount(email, defaultPassword, userId, { name, role: 'teacher' });
  if (authResult.success) {
    authSuccess = true;
    // Update user with Supabase ID if different
    if (authResult.userId !== userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { id: authResult.userId }
      }).catch(() => {}); // Ignore if update fails
    }
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

  // Get or create non-teaching staff role (global table)
  const ntRole = await prisma.role.upsert({
    where: { name: 'NON_TEACHING_STAFF' },
    update: {},
    create: { name: 'NON_TEACHING_STAFF' }
  });

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
        PostalCode: rest.postalCode || ''
      }
    });

    return user;
  });

  // DB succeeded - now create Supabase account
  let authSuccess = false;
  let authError = null;

  const authResult = await createSupabaseAccount(email, defaultPassword, userId, { name, role: 'staff' });
  if (authResult.success) {
    authSuccess = true;
    // Update user with Supabase ID if different
    if (authResult.userId !== userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { id: authResult.userId }
      }).catch(() => {}); // Ignore if update fails
    }
  } else {
    authError = authResult.error;
  }

  return { authSuccess, authError, email, recordId: result.id, name, defaultPassword };
}

// Import parent with Supabase account
async function importParent(data, schoolId) {
  const { name, email, phone, relation, studentAdmissionNo, ...rest } = data;

  if (!name || !relation || !studentAdmissionNo) {
    throw new Error('Missing required fields: name, relation, studentAdmissionNo');
  }

  // Find the student
  const student = await prisma.student.findFirst({
    where: { schoolId, admissionNo: normalizeStudentIdentifier(studentAdmissionNo) }
  });

  if (!student) {
    throw new Error(`Student with admission number '${studentAdmissionNo}' not found.`);
  }

  // Check if parent already exists
  const { authEmail, externalEmail, phone: normalizedPhone, school } = await resolveParentAccountIdentity({
    schoolId,
    admissionNumber: student.admissionNo,
    phone,
    externalEmail: email,
  });
  const storedContactNumber = normalizedPhone || buildMissingContactPlaceholder({
    schoolId,
    admissionNumber: student.admissionNo,
    role: `parent-${relation || 'guardian'}`,
  });

  const existingParent = await prisma.parent.findFirst({
    where: {
      schoolId,
      OR: [
        ...(normalizedPhone ? [{ contactNumber: normalizedPhone }] : []),
        ...(externalEmail ? [{ email: externalEmail }] : []),
      ],
    },
    include: { studentLinks: true },
  });

  // Get or create parent role (global table)
  const parentRole = await prisma.role.upsert({
    where: { name: 'PARENT' },
    update: {},
    create: { name: 'PARENT' }
  });

  // Map relation text to enum value
  const relationMap = {
    'father': 'FATHER',
    'mother': 'MOTHER',
    'guardian': 'GUARDIAN',
    'grandfather': 'GRANDFATHER',
    'grandmother': 'GRANDMOTHER',
    'uncle': 'UNCLE',
    'aunt': 'AUNT',
    'sibling': 'SIBLING',
    'other': 'OTHER'
  };
  const relationEnum = relationMap[relation.toLowerCase()] || 'GUARDIAN';

  // Create DB records FIRST using transaction
  const result = await prisma.$transaction(async (tx) => {
    let parent = existingParent;
    let userId = existingParent?.userId;

    if (!parent) {
      const user = await tx.user.create({
        data: {
          id: require('crypto').randomUUID(),
          name,
          email: normalizedPhone
            ? buildParentAuthEmail({ phone: normalizedPhone, school })
            : authEmail,
          password: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
          roleId: parentRole.id,
          schoolId,
          status: 'INACTIVE'
        }
      });
      userId = user.id;

      // Create parent record with required contactNumber field
      parent = await tx.parent.create({
        data: {
          userId: user.id,
          name,
          email: externalEmail || user.email,
          contactNumber: storedContactNumber,
          alternateNumber: normalizedPhone ? null : phone || null,
          schoolId,
          address: rest.address || null,
          occupation: rest.occupation || null
        }
      });
    }

    // Create student-parent link using junction table
    await tx.studentParentLink.upsert({
      where: {
        studentId_parentId: {
          studentId: student.userId,
          parentId: parent.id,
        },
      },
      update: {
        relation: relationEnum,
        isActive: true,
      },
      create: {
        studentId: student.userId,
        parentId: parent.id,
        relation: relationEnum,
        isPrimary: true
      },
    });

    return { id: userId };
  });

  return {
    authSuccess: false,
    authError: null,
    appAccessPending: true,
    email: authEmail,
    deliveryEmail: externalEmail,
    loginLabel: 'Phone Number',
    loginValue: normalizedPhone || 'Pending phone',
    recordId: result.id,
    name,
    defaultPassword: null,
  };
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
      description: rest.description || null
    }
  });

  return { authSuccess: null }; // No auth for library
}
