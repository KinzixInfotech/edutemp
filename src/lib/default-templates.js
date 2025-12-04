export const DEFAULT_TEMPLATES = {
    certificate: [
        {
            id: 'cert-modern-1',
            name: 'Modern Achievement',
            description: 'A clean, modern certificate for general achievements.',
            layoutConfig: {
                canvasSize: { width: 1123, height: 794 }, // A4 Landscape
                orientation: 'landscape',
                backgroundImage: '', // User can upload or we can provide a default URL if hosted
                backgroundColor: '#ffffff',
                elements: [
                    {
                        id: 'title',
                        type: 'text',
                        content: 'CERTIFICATE OF ACHIEVEMENT',
                        x: 261,
                        y: 100,
                        width: 600,
                        height: 60,
                        fontSize: 48,
                        fontFamily: 'Times New Roman',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a365d',
                        zIndex: 1
                    },
                    {
                        id: 'subtitle',
                        type: 'text',
                        content: 'This certificate is proudly presented to',
                        x: 361,
                        y: 180,
                        width: 400,
                        height: 30,
                        fontSize: 18,
                        fontFamily: 'Arial',
                        textAlign: 'center',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'student-name',
                        type: 'text',
                        content: '{{studentName}}',
                        x: 261,
                        y: 230,
                        width: 600,
                        height: 50,
                        fontSize: 36,
                        fontFamily: 'Great Vibes', // Cursive font if available, else fallback
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'line-1',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 311,
                        y: 280,
                        width: 500,
                        height: 2,
                        backgroundColor: '#cbd5e0',
                        zIndex: 1
                    },
                    {
                        id: 'body-text',
                        type: 'text',
                        content: 'For outstanding performance and dedication in {{class}} during the academic year 2024-2025.',
                        x: 211,
                        y: 310,
                        width: 700,
                        height: 60,
                        fontSize: 16,
                        fontFamily: 'Arial',
                        textAlign: 'center',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'date-label',
                        type: 'text',
                        content: 'Date',
                        x: 200,
                        y: 550,
                        width: 150,
                        height: 20,
                        fontSize: 14,
                        textAlign: 'center',
                        color: '#718096',
                        zIndex: 1
                    },
                    {
                        id: 'date-val',
                        type: 'text',
                        content: '{{issueDate}}',
                        x: 200,
                        y: 520,
                        width: 150,
                        height: 30,
                        fontSize: 16,
                        textAlign: 'center',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'line-date',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 200,
                        y: 545,
                        width: 150,
                        height: 1,
                        backgroundColor: '#cbd5e0',
                        zIndex: 1
                    },
                    {
                        id: 'sig-label',
                        type: 'text',
                        content: 'Principal Signature',
                        x: 773,
                        y: 550,
                        width: 200,
                        height: 20,
                        fontSize: 14,
                        textAlign: 'center',
                        color: '#718096',
                        zIndex: 1
                    },
                    {
                        id: 'line-sig',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 773,
                        y: 545,
                        width: 200,
                        height: 1,
                        backgroundColor: '#cbd5e0',
                        zIndex: 1
                    },
                    {
                        id: 'qr',
                        type: 'qrcode',
                        content: '{{verificationUrl}}',
                        x: 511,
                        y: 500,
                        width: 100,
                        height: 100,
                        zIndex: 1
                    }
                ]
            }
        },
        {
            id: 'cert-classic-1',
            name: 'Classic Border',
            description: 'Traditional certificate with a gold border style.',
            layoutConfig: {
                canvasSize: { width: 1123, height: 794 },
                orientation: 'landscape',
                backgroundColor: '#fffaf0', // Floral white
                elements: [
                    {
                        id: 'border-outer',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 20,
                        y: 20,
                        width: 1083,
                        height: 754,
                        backgroundColor: 'transparent',
                        borderColor: '#d69e2e', // Gold
                        borderWidth: 5,
                        zIndex: 0
                    },
                    {
                        id: 'border-inner',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 30,
                        y: 30,
                        width: 1063,
                        height: 734,
                        backgroundColor: 'transparent',
                        borderColor: '#744210', // Dark Gold/Brown
                        borderWidth: 2,
                        zIndex: 0
                    },
                    {
                        id: 'title',
                        type: 'text',
                        content: 'Certificate of Appreciation',
                        x: 261,
                        y: 120,
                        width: 600,
                        height: 60,
                        fontSize: 42,
                        fontFamily: 'Times New Roman',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#744210',
                        zIndex: 1
                    },
                    {
                        id: 'student-name',
                        type: 'text',
                        content: '{{studentName}}',
                        x: 261,
                        y: 250,
                        width: 600,
                        height: 50,
                        fontSize: 32,
                        fontFamily: 'serif',
                        textAlign: 'center',
                        color: '#2d3748',
                        zIndex: 1
                    }
                    // Add more elements as needed
                ]
            }
        }
    ],
    idcard: [
        {
            id: 'id-student-v1',
            name: 'Vertical Student ID',
            description: 'Standard vertical ID card for students.',
            layoutConfig: {
                canvasSize: { width: 204, height: 324 }, // CR80 size approx in px (3.375" x 2.125" @ 96dpi is small, let's use higher res: 638x1012 for print quality, or screen approx 300x470)
                // Let's stick to a reasonable screen size that scales well. 
                // CR80 is 85.6mm x 54mm. @ 300dpi -> 1011 x 638 px.
                // Vertical: 638 x 1011.
                canvasSize: { width: 638, height: 1011 },
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    {
                        id: 'header-bg',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 0,
                        y: 0,
                        width: 638,
                        height: 200,
                        backgroundColor: '#3182ce',
                        zIndex: 0
                    },
                    {
                        id: 'school-name',
                        type: 'text',
                        content: '{{schoolName}}',
                        x: 20,
                        y: 40,
                        width: 598,
                        height: 40,
                        fontSize: 28,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#ffffff',
                        zIndex: 1
                    },
                    {
                        id: 'photo-placeholder',
                        type: 'image', // Placeholder for student photo
                        url: '{{studentPhoto}}',
                        x: 194,
                        y: 120,
                        width: 250,
                        height: 250,
                        borderRadius: 125, // Circle
                        borderColor: '#ffffff',
                        borderWidth: 5,
                        zIndex: 2
                    },
                    {
                        id: 'name',
                        type: 'text',
                        content: '{{studentName}}',
                        x: 20,
                        y: 400,
                        width: 598,
                        height: 40,
                        fontSize: 32,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'role',
                        type: 'text',
                        content: 'STUDENT',
                        x: 20,
                        y: 450,
                        width: 598,
                        height: 30,
                        fontSize: 24,
                        textAlign: 'center',
                        color: '#3182ce',
                        zIndex: 1
                    },
                    {
                        id: 'details-box',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 40,
                        y: 500,
                        width: 558,
                        height: 300,
                        backgroundColor: '#f7fafc',
                        borderRadius: 10,
                        zIndex: 0
                    },
                    {
                        id: 'details-text',
                        type: 'text',
                        content: 'ID: {{studentId}}\nClass: {{class}}\nDOB: {{dob}}\nBlood Group: {{bloodGroup}}',
                        x: 60,
                        y: 520,
                        width: 518,
                        height: 260,
                        fontSize: 20,
                        textAlign: 'left',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'qr',
                        type: 'qrcode',
                        content: '{{studentId}}',
                        x: 219,
                        y: 820,
                        width: 200,
                        height: 200,
                        zIndex: 1
                    }
                ]
            }
        }
    ],
    admitcard: [
        {
            id: 'admit-detailed',
            name: 'Detailed Exam Admit Card',
            description: 'Comprehensive admit card with student photo, exam schedule table, and instructions.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 }, // A4 Portrait
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    // School Logo
                    {
                        id: 'school-logo',
                        type: 'image',
                        url: '{{schoolLogo}}',
                        x: 50,
                        y: 40,
                        width: 80,
                        height: 80,
                        zIndex: 1
                    },
                    // School Name Header
                    {
                        id: 'school-name',
                        type: 'text',
                        content: '{{schoolName}}',
                        x: 150,
                        y: 50,
                        width: 494,
                        height: 40,
                        fontSize: 28,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a365d',
                        zIndex: 1
                    },
                    {
                        id: 'school-address',
                        type: 'text',
                        content: '{{schoolAddress}}',
                        x: 150,
                        y: 85,
                        width: 494,
                        height: 25,
                        fontSize: 12,
                        textAlign: 'center',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    // Admit Card Title
                    {
                        id: 'title',
                        type: 'text',
                        content: 'EXAMINATION ADMIT CARD',
                        x: 50,
                        y: 140,
                        width: 694,
                        height: 40,
                        fontSize: 24,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#ffffff',
                        backgroundColor: '#2563eb',
                        zIndex: 1
                    },
                    // Student Photo
                    {
                        id: 'student-photo',
                        type: 'image',
                        url: '{{studentPhoto}}',
                        x: 620,
                        y: 200,
                        width: 120,
                        height: 140,
                        borderWidth: 2,
                        borderColor: '#cbd5e0',
                        zIndex: 2
                    },
                    // Student Details Section
                    {
                        id: 'label-name',
                        type: 'text',
                        content: 'Student Name:',
                        x: 60,
                        y: 210,
                        width: 150,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'value-name',
                        type: 'text',
                        content: '{{studentName}}',
                        x: 220,
                        y: 210,
                        width: 350,
                        height: 25,
                        fontSize: 14,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'label-father',
                        type: 'text',
                        content: "Father's Name:",
                        x: 60,
                        y: 240,
                        width: 150,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'value-father',
                        type: 'text',
                        content: '{{fatherName}}',
                        x: 220,
                        y: 240,
                        width: 350,
                        height: 25,
                        fontSize: 14,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'label-class',
                        type: 'text',
                        content: 'Class / Section:',
                        x: 60,
                        y: 270,
                        width: 150,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'value-class',
                        type: 'text',
                        content: '{{class}} - {{section}}',
                        x: 220,
                        y: 270,
                        width: 350,
                        height: 25,
                        fontSize: 14,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'label-roll',
                        type: 'text',
                        content: 'Roll Number:',
                        x: 60,
                        y: 300,
                        width: 150,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'value-roll',
                        type: 'text',
                        content: '{{rollNumber}}',
                        x: 220,
                        y: 300,
                        width: 350,
                        height: 25,
                        fontSize: 14,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    // Exam Details
                    {
                        id: 'exam-schedule-title',
                        type: 'text',
                        content: 'EXAMINATION SCHEDULE',
                        x: 50,
                        y: 360,
                        width: 694,
                        height: 35,
                        fontSize: 18,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a365d',
                        backgroundColor: '#e6f2ff',
                        zIndex: 1
                    },
                    // Table Header (Simulated)
                    {
                        id: 'table-header-bg',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 50,
                        y: 405,
                        width: 694,
                        height: 35,
                        backgroundColor: '#cbd5e0',
                        zIndex: 0
                    },
                    {
                        id: 'th-date',
                        type: 'text',
                        content: 'Date',
                        x: 60,
                        y: 410,
                        width: 140,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a202c',
                        zIndex: 1
                    },
                    {
                        id: 'th-subject',
                        type: 'text',
                        content: 'Subject',
                        x: 210,
                        y: 410,
                        width: 280,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a202c',
                        zIndex: 1
                    },
                    {
                        id: 'th-time',
                        type: 'text',
                        content: 'Time',
                        x: 500,
                        y: 410,
                        width: 120,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a202c',
                        zIndex: 1
                    },
                    {
                        id: 'th-marks',
                        type: 'text',
                        content: 'Max Marks',
                        x: 630,
                        y: 410,
                        width: 100,
                        height: 25,
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a202c',
                        zIndex: 1
                    },
                    // Note: In actual implementation, exam schedule rows would be dynamically generated
                    // This is a placeholder to show the structure
                    {
                        id: 'exam-info',
                        type: 'text',
                        content: '(Exam schedule will be populated during generation)',
                        x: 60,
                        y: 450,
                        width: 674,
                        height: 180,
                        fontSize: 12,
                        textAlign: 'center',
                        color: '#718096',
                        zIndex: 1
                    },
                    // Instructions
                    {
                        id: 'instructions-title',
                        type: 'text',
                        content: 'INSTRUCTIONS FOR CANDIDATES',
                        x: 50,
                        y: 660,
                        width: 694,
                        height: 35,
                        fontSize: 16,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a365d',
                        backgroundColor: '#e6f2ff',
                        zIndex: 1
                    },
                    {
                        id: 'instructions',
                        type: 'text',
                        content: `1. Candidates must bring this admit card to the examination hall.
2. Candidates should reach the examination center 30 minutes before the exam.
3. Mobile phones and electronic devices are strictly prohibited.
4. Use of unfair means will result in cancellation of examination.
5. Carry your own stationery items.`,
                        x: 70,
                        y: 710,
                        width: 654,
                        height: 120,
                        fontSize: 11,
                        textAlign: 'left',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    // Signature Section
                    {
                        id: 'principal-sig',
                        type: 'image',
                        url: '{{principalSignature}}',
                        x: 550,
                        y: 860,
                        width: 150,
                        height: 50,
                        zIndex: 1
                    },
                    {
                        id: 'sig-label',
                        type: 'text',
                        content: "Principal's Signature",
                        x: 550,
                        y: 915,
                        width: 150,
                        height: 20,
                        fontSize: 11,
                        textAlign: 'center',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    // Border
                    {
                        id: 'border',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 30,
                        y: 30,
                        width: 734,
                        height: 1063,
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        borderColor: '#2563eb',
                        zIndex: 0
                    }
                ]
            }
        },
        {
            id: 'admit-simple',
            name: 'Simple Admit Card',
            description: 'Basic exam admit card layout.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 }, // A4 Portrait
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    {
                        id: 'header',
                        type: 'text',
                        content: 'ADMIT CARD',
                        x: 97,
                        y: 50,
                        width: 600,
                        height: 60,
                        fontSize: 42,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: '#1a365d',
                        zIndex: 1
                    },
                    {
                        id: 'exam-name',
                        type: 'text',
                        content: '{{examName}}',
                        x: 97,
                        y: 120,
                        width: 600,
                        height: 40,
                        fontSize: 24,
                        textAlign: 'center',
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'student-photo',
                        type: 'image',
                        url: '{{studentPhoto}}',
                        x: 600,
                        y: 180,
                        width: 120,
                        height: 140,
                        borderWidth: 2,
                        borderColor: '#cbd5e0',
                        zIndex: 1
                    },
                    {
                        id: 'student-name-label',
                        type: 'text',
                        content: 'Name:',
                        x: 80,
                        y: 200,
                        width: 120,
                        height: 30,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'student-name',
                        type: 'text',
                        content: '{{studentName}}',
                        x: 210,
                        y: 200,
                        width: 350,
                        height: 30,
                        fontSize: 16,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'roll-label',
                        type: 'text',
                        content: 'Roll Number:',
                        x: 80,
                        y: 240,
                        width: 120,
                        height: 30,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'roll-value',
                        type: 'text',
                        content: '{{rollNumber}}',
                        x: 210,
                        y: 240,
                        width: 350,
                        height: 30,
                        fontSize: 16,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'class-label',
                        type: 'text',
                        content: 'Class:',
                        x: 80,
                        y: 280,
                        width: 120,
                        height: 30,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#2d3748',
                        zIndex: 1
                    },
                    {
                        id: 'class-value',
                        type: 'text',
                        content: '{{class}} - {{section}}',
                        x: 210,
                        y: 280,
                        width: 350,
                        height: 30,
                        fontSize: 16,
                        color: '#4a5568',
                        zIndex: 1
                    },
                    {
                        id: 'border',
                        type: 'shape',
                        shapeType: 'rectangle',
                        x: 40,
                        y: 40,
                        width: 714,
                        height: 1043,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderColor: '#2563eb',
                        zIndex: 0
                    }
                ]
            }
        }
    ]
};
