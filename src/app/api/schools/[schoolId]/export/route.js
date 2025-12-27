import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';

// Export configurations for each module
const EXPORT_CONFIGS = {
    students: {
        name: 'Students',
        fields: [
            { key: 'admissionNo', label: 'Admission No' },
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'gender', label: 'Gender' },
            { key: 'dob', label: 'Date of Birth' },
            { key: 'rollNumber', label: 'Roll Number' },
            { key: 'className', label: 'Class' },
            { key: 'sectionName', label: 'Section' },
            { key: 'contactNumber', label: 'Contact' },
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
            { key: 'FatherName', label: 'Father Name' },
            { key: 'MotherName', label: 'Mother Name' },
            { key: 'FatherNumber', label: 'Father Phone' },
            { key: 'MotherNumber', label: 'Mother Phone' },
            { key: 'bloodGroup', label: 'Blood Group' },
            { key: 'admissionDate', label: 'Admission Date' },
        ],
        fetchFn: async (schoolId) => {
            const students = await prisma.student.findMany({
                where: { schoolId },
                include: {
                    section: { include: { class: true } }
                },
                orderBy: { name: 'asc' }
            });
            return students.map(s => ({
                ...s,
                className: s.section?.class?.className || '',
                sectionName: s.section?.name || ''
            }));
        }
    },
    teachers: {
        name: 'Teachers',
        fields: [
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'gender', label: 'Gender' },
            { key: 'designation', label: 'Designation' },
            { key: 'phone', label: 'Phone' },
            { key: 'qualification', label: 'Qualification' },
            { key: 'joiningDate', label: 'Joining Date' },
            { key: 'salary', label: 'Salary' },
        ],
        fetchFn: async (schoolId) => {
            const teachers = await prisma.teachingStaff.findMany({
                where: { schoolId },
                include: { user: true },
                orderBy: { user: { name: 'asc' } }
            });
            return teachers.map(t => ({
                employeeId: t.employeeId,
                name: t.user?.name || '',
                email: t.user?.email || '',
                gender: t.user?.gender || '',
                designation: t.designation,
                phone: t.phone,
                qualification: t.qualification,
                joiningDate: t.joiningDate,
                salary: t.salary
            }));
        }
    },
    nonTeachingStaff: {
        name: 'Non-Teaching Staff',
        fields: [
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'gender', label: 'Gender' },
            { key: 'designation', label: 'Designation' },
            { key: 'department', label: 'Department' },
            { key: 'phone', label: 'Phone' },
            { key: 'joiningDate', label: 'Joining Date' },
        ],
        fetchFn: async (schoolId) => {
            const staff = await prisma.nonTeachingStaff.findMany({
                where: { schoolId },
                include: { user: true },
                orderBy: { user: { name: 'asc' } }
            });
            return staff.map(s => ({
                employeeId: s.employeeId,
                name: s.user?.name || '',
                email: s.user?.email || '',
                gender: s.user?.gender || '',
                designation: s.designation,
                department: s.department,
                phone: s.phone,
                joiningDate: s.dateOfJoining
            }));
        }
    },
    parents: {
        name: 'Parents',
        fields: [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'relation', label: 'Relation' },
            { key: 'studentName', label: 'Student Name' },
            { key: 'studentAdmissionNo', label: 'Student Admission No' },
            { key: 'occupation', label: 'Occupation' },
        ],
        fetchFn: async (schoolId) => {
            const parents = await prisma.parent.findMany({
                where: { schoolId },
                include: {
                    user: true,
                    students: true
                },
                orderBy: { user: { name: 'asc' } }
            });
            return parents.map(p => ({
                name: p.user?.name || p.name || '',
                email: p.user?.email || p.email || '',
                phone: p.phone,
                relation: p.relation,
                studentName: p.students?.[0]?.name || '',
                studentAdmissionNo: p.students?.[0]?.admissionNo || '',
                occupation: p.occupation
            }));
        }
    },
    classes: {
        name: 'Classes',
        fields: [
            { key: 'className', label: 'Class Name' },
            { key: 'sections', label: 'Sections' },
            { key: 'studentCount', label: 'Student Count' },
        ],
        fetchFn: async (schoolId) => {
            const classes = await prisma.class.findMany({
                where: { schoolId },
                include: {
                    sections: {
                        include: { _count: { select: { students: true } } }
                    }
                },
                orderBy: { className: 'asc' }
            });
            return classes.map(c => ({
                className: c.className,
                sections: c.sections.map(s => s.name).join(', '),
                studentCount: c.sections.reduce((sum, s) => sum + (s._count?.students || 0), 0)
            }));
        }
    },
    inventory: {
        name: 'Inventory',
        fields: [
            { key: 'name', label: 'Item Name' },
            { key: 'category', label: 'Category' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'unit', label: 'Unit' },
            { key: 'costPerUnit', label: 'Cost Per Unit' },
            { key: 'location', label: 'Location' },
            { key: 'vendorName', label: 'Vendor' },
        ],
        fetchFn: async (schoolId) => {
            const items = await prisma.inventoryItem.findMany({
                where: { schoolId },
                include: { category: true },
                orderBy: { name: 'asc' }
            });
            return items.map(i => ({
                name: i.name,
                category: i.category?.name || '',
                quantity: i.quantity,
                unit: i.unit,
                costPerUnit: i.costPerUnit,
                location: i.location,
                vendorName: i.vendorName
            }));
        }
    },
    library: {
        name: 'Library Books',
        fields: [
            { key: 'title', label: 'Title' },
            { key: 'author', label: 'Author' },
            { key: 'isbn', label: 'ISBN' },
            { key: 'category', label: 'Category' },
            { key: 'publishedYear', label: 'Published Year' },
            { key: 'copies', label: 'Copies' },
            { key: 'available', label: 'Available' },
        ],
        fetchFn: async (schoolId) => {
            const books = await prisma.libraryBook.findMany({
                where: { schoolId },
                orderBy: { title: 'asc' }
            });
            return books.map(b => ({
                title: b.title,
                author: b.author,
                isbn: b.isbn,
                category: b.category,
                publishedYear: b.publishedYear,
                copies: b.totalCopies,
                available: b.availableCopies
            }));
        }
    }
};

// GET: Get available export modules
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const modules = Object.entries(EXPORT_CONFIGS).map(([id, config]) => ({
            id,
            name: config.name,
            fields: config.fields.map(f => f.label)
        }));

        return NextResponse.json({ modules });
    } catch (error) {
        console.error('[EXPORT MODULES ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Export selected modules to Excel
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const { modules: selectedModules, format = 'xlsx' } = await req.json();

        if (!selectedModules || selectedModules.length === 0) {
            return NextResponse.json({ error: 'No modules selected' }, { status: 400 });
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const exportStats = [];

        for (const moduleId of selectedModules) {
            const config = EXPORT_CONFIGS[moduleId];
            if (!config) continue;

            try {
                // Fetch data
                const data = await config.fetchFn(schoolId);

                // Create worksheet data with headers
                const headers = config.fields.map(f => f.label);
                const rows = data.map(item =>
                    config.fields.map(f => {
                        const value = item[f.key];
                        // Format dates
                        if (value instanceof Date) {
                            return value.toISOString().split('T')[0];
                        }
                        return value || '';
                    })
                );

                // Create worksheet
                const worksheet = XLSX.utils.aoa_to_array([headers, ...rows]);
                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

                // Add to workbook
                XLSX.utils.book_append_sheet(workbook, ws, config.name.substring(0, 31)); // Sheet name max 31 chars

                exportStats.push({
                    module: moduleId,
                    name: config.name,
                    recordCount: data.length
                });
            } catch (moduleError) {
                console.error(`[EXPORT ERROR - ${moduleId}]`, moduleError);
                exportStats.push({
                    module: moduleId,
                    name: config.name,
                    recordCount: 0,
                    error: moduleError.message
                });
            }
        }

        // Generate file
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: format });

        // Return file as base64
        const base64 = Buffer.from(buffer).toString('base64');
        const fileName = `export_${new Date().toISOString().split('T')[0]}.${format}`;

        return NextResponse.json({
            success: true,
            fileName,
            fileData: base64,
            mimeType: format === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/vnd.ms-excel',
            stats: exportStats
        });

    } catch (error) {
        console.error('[EXPORT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
