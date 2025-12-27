import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Module field configurations (same as config route)
const MODULE_CONFIGS = {
    students: {
        name: 'Students',
        fields: [
            { name: 'name', label: 'Full Name', required: true, example: 'John Doe' },
            { name: 'email', label: 'Email', required: true, example: 'john@example.com' },
            { name: 'admissionNo', label: 'Admission Number', required: true, example: 'ADM001' },
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'sectionName', label: 'Section', required: true, example: 'A' },
            { name: 'gender', label: 'Gender', required: true, example: 'Male' },
            { name: 'dob', label: 'Date of Birth (YYYY-MM-DD)', required: true, example: '2010-05-15' },
            { name: 'rollNumber', label: 'Roll Number', required: false, example: '01' },
            { name: 'contactNumber', label: 'Contact Number', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', required: false, example: '123 Main Street' },
            { name: 'city', label: 'City', required: false, example: 'Mumbai' },
            { name: 'state', label: 'State', required: false, example: 'Maharashtra' },
            { name: 'fatherName', label: 'Father Name', required: false, example: 'Robert Doe' },
            { name: 'motherName', label: 'Mother Name', required: false, example: 'Jane Doe' },
            { name: 'fatherPhone', label: 'Father Phone', required: false, example: '9876543211' },
            { name: 'motherPhone', label: 'Mother Phone', required: false, example: '9876543212' },
            { name: 'bloodGroup', label: 'Blood Group', required: false, example: 'O+' },
        ]
    },
    teachers: {
        name: 'Teaching Staff',
        fields: [
            { name: 'name', label: 'Full Name', required: true, example: 'Dr. Sarah Johnson' },
            { name: 'email', label: 'Email', required: true, example: 'sarah@school.com' },
            { name: 'employeeId', label: 'Employee ID', required: true, example: 'EMP001' },
            { name: 'gender', label: 'Gender', required: true, example: 'Female' },
            { name: 'designation', label: 'Designation', required: true, example: 'Senior Teacher' },
            { name: 'phone', label: 'Phone Number', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', required: false, example: '456 Oak Avenue' },
            { name: 'qualification', label: 'Qualification', required: false, example: 'M.Ed, B.Sc' },
            { name: 'subjects', label: 'Subjects (comma separated)', required: false, example: 'Mathematics, Physics' },
            { name: 'joiningDate', label: 'Joining Date (YYYY-MM-DD)', required: false, example: '2020-04-01' },
            { name: 'salary', label: 'Salary', required: false, example: '50000' },
        ]
    },
    parents: {
        name: 'Parents',
        fields: [
            { name: 'name', label: 'Full Name', required: true, example: 'Robert Smith' },
            { name: 'email', label: 'Email', required: true, example: 'robert@email.com' },
            { name: 'phone', label: 'Phone Number', required: true, example: '9876543210' },
            { name: 'relation', label: 'Relation (Father/Mother/Guardian)', required: true, example: 'Father' },
            { name: 'studentAdmissionNo', label: 'Student Admission No', required: true, example: 'ADM001' },
            { name: 'address', label: 'Address', required: false, example: '789 Pine Road' },
            { name: 'occupation', label: 'Occupation', required: false, example: 'Engineer' },
        ]
    },
    classes: {
        name: 'Classes',
        fields: [
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'section', label: 'Section', required: true, example: 'A' },
            { name: 'classTeacherEmail', label: 'Class Teacher Email', required: false, example: 'teacher@school.com' },
            { name: 'maxStudents', label: 'Max Students', required: false, example: '40' },
        ]
    },
    subjects: {
        name: 'Subjects',
        fields: [
            { name: 'name', label: 'Subject Name', required: true, example: 'Mathematics' },
            { name: 'code', label: 'Subject Code', required: true, example: 'MATH101' },
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'teacherEmail', label: 'Teacher Email', required: false, example: 'teacher@school.com' },
        ]
    },
    inventory: {
        name: 'Inventory Items',
        fields: [
            { name: 'name', label: 'Item Name', required: true, example: 'Whiteboard Marker' },
            { name: 'category', label: 'Category', required: true, example: 'Stationery' },
            { name: 'quantity', label: 'Quantity', required: true, example: '100' },
            { name: 'unit', label: 'Unit', required: true, example: 'pieces' },
            { name: 'costPerUnit', label: 'Cost Per Unit', required: true, example: '25' },
            { name: 'minimumQuantity', label: 'Minimum Quantity', required: false, example: '20' },
            { name: 'location', label: 'Storage Location', required: false, example: 'Store Room A' },
            { name: 'vendorName', label: 'Vendor Name', required: false, example: 'ABC Supplies' },
        ]
    },
    library: {
        name: 'Library Books',
        fields: [
            { name: 'title', label: 'Book Title', required: true, example: 'Introduction to Physics' },
            { name: 'author', label: 'Author', required: true, example: 'H.C. Verma' },
            { name: 'isbn', label: 'ISBN', required: true, example: '978-0-123456-78-9' },
            { name: 'category', label: 'Category', required: true, example: 'Science' },
            { name: 'publisher', label: 'Publisher', required: false, example: 'Oxford Press' },
            { name: 'publishedYear', label: 'Published Year', required: false, example: '2020' },
            { name: 'copies', label: 'Number of Copies', required: false, example: '5' },
        ]
    },
    nonTeachingStaff: {
        name: 'Non-Teaching Staff',
        fields: [
            { name: 'name', label: 'Full Name', required: true, example: 'Ramesh Kumar' },
            { name: 'email', label: 'Email', required: true, example: 'ramesh@school.com' },
            { name: 'employeeId', label: 'Employee ID', required: true, example: 'NTS001' },
            { name: 'gender', label: 'Gender', required: true, example: 'Male' },
            { name: 'designation', label: 'Designation', required: true, example: 'Accountant' },
            { name: 'department', label: 'Department', required: true, example: 'Administration' },
            { name: 'phone', label: 'Phone Number', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', required: false, example: '456 Oak Avenue' },
            { name: 'joiningDate', label: 'Joining Date (YYYY-MM-DD)', required: false, example: '2020-04-01' },
            { name: 'salary', label: 'Salary', required: false, example: '30000' },
        ]
    },
    busRoutes: {
        name: 'Bus Routes',
        fields: [
            { name: 'routeName', label: 'Route Name', required: true, example: 'Route A - North Zone' },
            { name: 'vehicleNumber', label: 'Vehicle Number', required: true, example: 'MH01AB1234' },
            { name: 'driverName', label: 'Driver Name', required: true, example: 'Suresh Patil' },
            { name: 'driverPhone', label: 'Driver Phone', required: true, example: '9876543210' },
            { name: 'startPoint', label: 'Start Point', required: true, example: 'School Gate' },
            { name: 'endPoint', label: 'End Point', required: true, example: 'Railway Station' },
            { name: 'stopName', label: 'Stop Name', required: false, example: 'City Center' },
            { name: 'stopTime', label: 'Stop Time', required: false, example: '07:30' },
            { name: 'monthlyFee', label: 'Monthly Fee', required: false, example: '1500' },
        ]
    },
    timetable: {
        name: 'Timetable',
        fields: [
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'sectionName', label: 'Section', required: true, example: 'A' },
            { name: 'dayOfWeek', label: 'Day of Week', required: true, example: 'Monday' },
            { name: 'periodNumber', label: 'Period Number', required: true, example: '1' },
            { name: 'subjectName', label: 'Subject Name', required: true, example: 'Mathematics' },
            { name: 'teacherEmail', label: 'Teacher Email', required: true, example: 'teacher@school.com' },
            { name: 'startTime', label: 'Start Time', required: true, example: '09:00' },
            { name: 'endTime', label: 'End Time', required: true, example: '09:45' },
            { name: 'room', label: 'Room Number', required: false, example: 'Room 101' },
        ]
    },
    feeStructure: {
        name: 'Fee Structure',
        fields: [
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'feeType', label: 'Fee Type', required: true, example: 'Tuition Fee' },
            { name: 'amount', label: 'Amount', required: true, example: '5000' },
            { name: 'frequency', label: 'Frequency', required: true, example: 'Monthly' },
            { name: 'dueDay', label: 'Due Day of Month', required: false, example: '10' },
            { name: 'lateFee', label: 'Late Fee', required: false, example: '100' },
            { name: 'description', label: 'Description', required: false, example: 'Monthly tuition charges' },
        ]
    },
    exams: {
        name: 'Exams',
        fields: [
            { name: 'examName', label: 'Exam Name', required: true, example: 'Mid-Term Examination' },
            { name: 'className', label: 'Class Name', required: true, example: 'Class 10' },
            { name: 'subjectName', label: 'Subject Name', required: true, example: 'Mathematics' },
            { name: 'examDate', label: 'Exam Date (YYYY-MM-DD)', required: true, example: '2024-03-15' },
            { name: 'startTime', label: 'Start Time', required: true, example: '10:00' },
            { name: 'endTime', label: 'End Time', required: true, example: '12:00' },
            { name: 'maxMarks', label: 'Maximum Marks', required: true, example: '100' },
            { name: 'passingMarks', label: 'Passing Marks', required: false, example: '35' },
            { name: 'room', label: 'Room Number', required: false, example: 'Hall A' },
        ]
    },
    fees: {
        name: 'Fee Payments',
        fields: [
            { name: 'studentAdmissionNo', label: 'Student Admission No', required: true, example: 'ADM001' },
            { name: 'feeType', label: 'Fee Type', required: true, example: 'Tuition Fee' },
            { name: 'amount', label: 'Amount Paid', required: true, example: '5000' },
            { name: 'paymentDate', label: 'Payment Date (YYYY-MM-DD)', required: true, example: '2024-01-15' },
            { name: 'paymentMode', label: 'Payment Mode', required: true, example: 'Cash' },
            { name: 'receiptNumber', label: 'Receipt Number', required: false, example: 'RCP001' },
            { name: 'remarks', label: 'Remarks', required: false, example: 'March month fee' },
        ]
    }
};

// GET: Download Excel template for a module
export async function GET(req, { params }) {
    try {
        const { searchParams } = new URL(req.url);
        const module = searchParams.get('module');

        if (!module || !MODULE_CONFIGS[module]) {
            return NextResponse.json({
                error: 'Invalid module. Available modules: ' + Object.keys(MODULE_CONFIGS).join(', ')
            }, { status: 400 });
        }

        const config = MODULE_CONFIGS[module];

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: Data (Main sheet with horizontal headers)
        // Add S.No as first column, then all field headers
        const headers = ['S.No', ...config.fields.map(f => f.required ? `${f.label} *` : f.label)];

        // Create sheet with just headers (no sample row - cleaner)
        const dataSheet = [headers];
        const wsData = XLSX.utils.aoa_to_sheet(dataSheet);

        // Set column widths
        wsData['!cols'] = [
            { wch: 6 }, // S.No
            ...config.fields.map(f => ({ wch: Math.max(f.label.length + 4, 18) }))
        ];

        // Add Data sheet first
        XLSX.utils.book_append_sheet(wb, wsData, 'Data');

        // Sheet 2: Instructions (Reference sheet)
        const instructionsData = [
            ['EduBreezy - ' + config.name + ' Import Template'],
            [''],
            ['INSTRUCTIONS:'],
            ['1. Fill in the data in the "Data" sheet (first sheet)'],
            ['2. Do not modify column headers'],
            ['3. Fields marked with * are required'],
            ['4. Date format: YYYY-MM-DD (e.g., 2024-01-15)'],
            ['5. Save as .xlsx format before uploading'],
            [''],
            ['FIELD REFERENCE:'],
            ['Field Name', 'Required/Optional', 'Example Value'],
        ];

        config.fields.forEach(field => {
            instructionsData.push([
                field.label,
                field.required ? 'Required' : 'Optional',
                field.example
            ]);
        });

        const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
        wsInstructions['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 35 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Return as downloadable file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${module}_import_template.xlsx"`,
            },
        });
    } catch (error) {
        console.error('[TEMPLATE DOWNLOAD ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

