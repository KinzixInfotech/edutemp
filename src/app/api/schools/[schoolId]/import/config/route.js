import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Module configurations with field definitions
const MODULE_CONFIGS = {
    students: {
        name: 'Students',
        description: 'Import student records in bulk',
        fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true, example: 'John Doe' },
            { name: 'email', label: 'Email', type: 'email', required: true, example: 'john@example.com' },
            { name: 'admissionNo', label: 'Admission Number', type: 'text', required: true, example: 'ADM001' },
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'sectionName', label: 'Section', type: 'text', required: true, example: 'A' },
            { name: 'gender', label: 'Gender', type: 'select', required: true, example: 'Male', options: ['Male', 'Female', 'Other'] },
            { name: 'dob', label: 'Date of Birth', type: 'date', required: true, example: '2010-05-15' },
            { name: 'rollNumber', label: 'Roll Number', type: 'text', required: false, example: '01' },
            { name: 'contactNumber', label: 'Contact Number', type: 'text', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', type: 'text', required: false, example: '123 Main Street' },
            { name: 'city', label: 'City', type: 'text', required: false, example: 'Mumbai' },
            { name: 'state', label: 'State', type: 'text', required: false, example: 'Maharashtra' },
            { name: 'fatherName', label: 'Father Name', type: 'text', required: false, example: 'Robert Doe' },
            { name: 'motherName', label: 'Mother Name', type: 'text', required: false, example: 'Jane Doe' },
            { name: 'fatherPhone', label: 'Father Phone', type: 'text', required: false, example: '9876543211' },
            { name: 'motherPhone', label: 'Mother Phone', type: 'text', required: false, example: '9876543212' },
            { name: 'bloodGroup', label: 'Blood Group', type: 'text', required: false, example: 'O+' },
        ]
    },
    teachers: {
        name: 'Teaching Staff',
        description: 'Import teaching staff records',
        fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true, example: 'Dr. Sarah Johnson' },
            { name: 'email', label: 'Email', type: 'email', required: true, example: 'sarah@school.com' },
            { name: 'employeeId', label: 'Employee ID', type: 'text', required: true, example: 'EMP001' },
            { name: 'gender', label: 'Gender', type: 'select', required: true, example: 'Female', options: ['Male', 'Female', 'Other'] },
            { name: 'designation', label: 'Designation', type: 'text', required: true, example: 'Senior Teacher' },
            { name: 'phone', label: 'Phone Number', type: 'text', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', type: 'text', required: false, example: '456 Oak Avenue' },
            { name: 'qualification', label: 'Qualification', type: 'text', required: false, example: 'M.Ed, B.Sc' },
            { name: 'subjects', label: 'Subjects (comma separated)', type: 'text', required: false, example: 'Mathematics, Physics' },
            { name: 'joiningDate', label: 'Joining Date', type: 'date', required: false, example: '2020-04-01' },
            { name: 'salary', label: 'Salary', type: 'number', required: false, example: '50000' },
        ]
    },
    parents: {
        name: 'Parents',
        description: 'Import parent records',
        fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true, example: 'Robert Smith' },
            { name: 'email', label: 'Email', type: 'email', required: true, example: 'robert@email.com' },
            { name: 'phone', label: 'Phone Number', type: 'text', required: true, example: '9876543210' },
            { name: 'relation', label: 'Relation', type: 'select', required: true, example: 'Father', options: ['Father', 'Mother', 'Guardian'] },
            { name: 'studentAdmissionNo', label: 'Student Admission No', type: 'text', required: true, example: 'ADM001' },
            { name: 'address', label: 'Address', type: 'text', required: false, example: '789 Pine Road' },
            { name: 'occupation', label: 'Occupation', type: 'text', required: false, example: 'Engineer' },
            { name: 'annualIncome', label: 'Annual Income', type: 'number', required: false, example: '1000000' },
        ]
    },
    classes: {
        name: 'Classes',
        description: 'Import class and section records',
        fields: [
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'section', label: 'Section', type: 'text', required: true, example: 'A' },
            { name: 'classTeacherEmail', label: 'Class Teacher Email', type: 'email', required: false, example: 'teacher@school.com' },
            { name: 'maxStudents', label: 'Max Students', type: 'number', required: false, example: '40' },
            { name: 'room', label: 'Room Number', type: 'text', required: false, example: 'Room 101' },
        ]
    },
    subjects: {
        name: 'Subjects',
        description: 'Import subject records',
        fields: [
            { name: 'name', label: 'Subject Name', type: 'text', required: true, example: 'Mathematics' },
            { name: 'code', label: 'Subject Code', type: 'text', required: true, example: 'MATH101' },
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'teacherEmail', label: 'Teacher Email', type: 'email', required: false, example: 'teacher@school.com' },
            { name: 'credits', label: 'Credits', type: 'number', required: false, example: '4' },
            { name: 'type', label: 'Type', type: 'select', required: false, example: 'Core', options: ['Core', 'Elective', 'Optional'] },
        ]
    },
    inventory: {
        name: 'Inventory Items',
        description: 'Import inventory items',
        fields: [
            { name: 'name', label: 'Item Name', type: 'text', required: true, example: 'Whiteboard Marker' },
            { name: 'category', label: 'Category', type: 'text', required: true, example: 'Stationery' },
            { name: 'quantity', label: 'Quantity', type: 'number', required: true, example: '100' },
            { name: 'unit', label: 'Unit', type: 'text', required: true, example: 'pieces' },
            { name: 'costPerUnit', label: 'Cost Per Unit', type: 'number', required: true, example: '25' },
            { name: 'minimumQuantity', label: 'Minimum Quantity', type: 'number', required: false, example: '20' },
            { name: 'location', label: 'Storage Location', type: 'text', required: false, example: 'Store Room A' },
            { name: 'vendorName', label: 'Vendor Name', type: 'text', required: false, example: 'ABC Supplies' },
        ]
    },
    library: {
        name: 'Library Books',
        description: 'Import library book records',
        fields: [
            { name: 'title', label: 'Book Title', type: 'text', required: true, example: 'Introduction to Physics' },
            { name: 'author', label: 'Author', type: 'text', required: true, example: 'H.C. Verma' },
            { name: 'isbn', label: 'ISBN', type: 'text', required: true, example: '978-0-123456-78-9' },
            { name: 'category', label: 'Category', type: 'text', required: true, example: 'Science' },
            { name: 'publisher', label: 'Publisher', type: 'text', required: false, example: 'Oxford Press' },
            { name: 'publishedYear', label: 'Published Year', type: 'number', required: false, example: '2020' },
            { name: 'copies', label: 'Number of Copies', type: 'number', required: false, example: '5' },
            { name: 'location', label: 'Shelf Location', type: 'text', required: false, example: 'Shelf A-12' },
        ]
    },
    nonTeachingStaff: {
        name: 'Non-Teaching Staff',
        description: 'Import non-teaching staff records',
        fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true, example: 'Ramesh Kumar' },
            { name: 'email', label: 'Email', type: 'email', required: true, example: 'ramesh@school.com' },
            { name: 'employeeId', label: 'Employee ID', type: 'text', required: true, example: 'NTS001' },
            { name: 'gender', label: 'Gender', type: 'select', required: true, example: 'Male', options: ['Male', 'Female', 'Other'] },
            { name: 'designation', label: 'Designation', type: 'text', required: true, example: 'Accountant' },
            { name: 'department', label: 'Department', type: 'text', required: true, example: 'Administration' },
            { name: 'phone', label: 'Phone Number', type: 'text', required: false, example: '9876543210' },
            { name: 'address', label: 'Address', type: 'text', required: false, example: '456 Oak Avenue' },
            { name: 'joiningDate', label: 'Joining Date', type: 'date', required: false, example: '2020-04-01' },
            { name: 'salary', label: 'Salary', type: 'number', required: false, example: '30000' },
        ]
    },
    busRoutes: {
        name: 'Bus Routes & Stops',
        description: 'Import bus routes and stops',
        fields: [
            { name: 'routeName', label: 'Route Name', type: 'text', required: true, example: 'Route A - North Zone' },
            { name: 'vehicleNumber', label: 'Vehicle Number', type: 'text', required: true, example: 'MH01AB1234' },
            { name: 'driverName', label: 'Driver Name', type: 'text', required: true, example: 'Suresh Patil' },
            { name: 'driverPhone', label: 'Driver Phone', type: 'text', required: true, example: '9876543210' },
            { name: 'startPoint', label: 'Start Point', type: 'text', required: true, example: 'School Gate' },
            { name: 'endPoint', label: 'End Point', type: 'text', required: true, example: 'Railway Station' },
            { name: 'stopName', label: 'Stop Name', type: 'text', required: false, example: 'City Center' },
            { name: 'stopTime', label: 'Stop Time', type: 'text', required: false, example: '07:30' },
            { name: 'monthlyFee', label: 'Monthly Fee', type: 'number', required: false, example: '1500' },
        ]
    },
    timetable: {
        name: 'Timetable',
        description: 'Import class timetable entries',
        fields: [
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'sectionName', label: 'Section', type: 'text', required: true, example: 'A' },
            { name: 'dayOfWeek', label: 'Day of Week', type: 'select', required: true, example: 'Monday', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
            { name: 'periodNumber', label: 'Period Number', type: 'number', required: true, example: '1' },
            { name: 'subjectName', label: 'Subject Name', type: 'text', required: true, example: 'Mathematics' },
            { name: 'teacherEmail', label: 'Teacher Email', type: 'email', required: true, example: 'teacher@school.com' },
            { name: 'startTime', label: 'Start Time', type: 'text', required: true, example: '09:00' },
            { name: 'endTime', label: 'End Time', type: 'text', required: true, example: '09:45' },
            { name: 'room', label: 'Room Number', type: 'text', required: false, example: 'Room 101' },
        ]
    },
    feeStructure: {
        name: 'Fee Structure',
        description: 'Import fee structure for classes',
        fields: [
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'feeType', label: 'Fee Type', type: 'text', required: true, example: 'Tuition Fee' },
            { name: 'amount', label: 'Amount', type: 'number', required: true, example: '5000' },
            { name: 'frequency', label: 'Frequency', type: 'select', required: true, example: 'Monthly', options: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'] },
            { name: 'dueDay', label: 'Due Day of Month', type: 'number', required: false, example: '10' },
            { name: 'lateFee', label: 'Late Fee', type: 'number', required: false, example: '100' },
            { name: 'description', label: 'Description', type: 'text', required: false, example: 'Monthly tuition charges' },
        ]
    },
    exams: {
        name: 'Exams',
        description: 'Import exam schedules',
        fields: [
            { name: 'examName', label: 'Exam Name', type: 'text', required: true, example: 'Mid-Term Examination' },
            { name: 'className', label: 'Class Name', type: 'text', required: true, example: 'Class 10' },
            { name: 'subjectName', label: 'Subject Name', type: 'text', required: true, example: 'Mathematics' },
            { name: 'examDate', label: 'Exam Date', type: 'date', required: true, example: '2024-03-15' },
            { name: 'startTime', label: 'Start Time', type: 'text', required: true, example: '10:00' },
            { name: 'endTime', label: 'End Time', type: 'text', required: true, example: '12:00' },
            { name: 'maxMarks', label: 'Maximum Marks', type: 'number', required: true, example: '100' },
            { name: 'passingMarks', label: 'Passing Marks', type: 'number', required: false, example: '35' },
            { name: 'room', label: 'Room Number', type: 'text', required: false, example: 'Hall A' },
        ]
    },
    fees: {
        name: 'Student Fees (Payments)',
        description: 'Import fee payment records',
        fields: [
            { name: 'studentAdmissionNo', label: 'Student Admission No', type: 'text', required: true, example: 'ADM001' },
            { name: 'feeType', label: 'Fee Type', type: 'text', required: true, example: 'Tuition Fee' },
            { name: 'amount', label: 'Amount Paid', type: 'number', required: true, example: '5000' },
            { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true, example: '2024-01-15' },
            { name: 'paymentMode', label: 'Payment Mode', type: 'select', required: true, example: 'Cash', options: ['Cash', 'Cheque', 'Online', 'Card', 'UPI'] },
            { name: 'receiptNumber', label: 'Receipt Number', type: 'text', required: false, example: 'RCP001' },
            { name: 'remarks', label: 'Remarks', type: 'text', required: false, example: 'March month fee' },
        ]
    }
};

// GET: Get module configurations
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const module = searchParams.get('module');

        if (module && MODULE_CONFIGS[module]) {
            return NextResponse.json(MODULE_CONFIGS[module]);
        }

        // Return all modules summary
        const modules = Object.entries(MODULE_CONFIGS).map(([key, config]) => ({
            id: key,
            name: config.name,
            description: config.description,
            fieldCount: config.fields.length,
            requiredCount: config.fields.filter(f => f.required).length
        }));

        return NextResponse.json({ modules });
    } catch (error) {
        console.error('[TEMPLATE CONFIG ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
