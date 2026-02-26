// Type-specific certificate templates + generic fallbacks
const TC_FIELDS = [
    { label: '1. Name of the Student', placeholder: '{{studentName}}' },
    { label: "2. Father's / Guardian's Name", placeholder: '{{fatherName}}' },
    { label: "3. Mother's Name", placeholder: '{{motherName}}' },
    { label: '4. Date of Birth (in figures)', placeholder: '{{dob}}' },
    { label: '5. Nationality', placeholder: '{{nationality}}' },
    { label: '6. Category (SC/ST/OBC/Gen)', placeholder: '{{category}}' },
    { label: '7. Admission No.', placeholder: '{{admissionNo}}' },
    { label: '8. Date of Admission with Class', placeholder: '{{admissionDate}}' },
    { label: '9. Class in which studying at the time of leaving', placeholder: '{{class}}' },
    { label: '10. Date of Leaving', placeholder: '{{dateOfLeaving}}' },
    { label: '11. Reason for Leaving', placeholder: '{{reason}}' },
    { label: '12. Conduct & Character', placeholder: '{{conduct}}' },
];

function buildLabelValueRows(fields, startY, labelX, valueX, labelW, valueW, rowH, fontSize) {
    const els = [];
    fields.forEach((f, i) => {
        const y = startY + i * rowH;
        els.push({
            id: `tc-label-${i}`, type: 'text', content: f.label,
            x: labelX, y, width: labelW, height: rowH,
            fontSize, fontWeight: 'bold', color: '#1a202c', zIndex: 1
        });
        els.push({
            id: `tc-value-${i}`, type: 'text', content: f.placeholder,
            x: valueX, y, width: valueW, height: rowH,
            fontSize, color: '#2d3748', zIndex: 1
        });
    });
    return els;
}

export const DEFAULT_TEMPLATES = {
    // ── Transfer Certificate ──
    transfer: [
        {
            id: 'tc-formal-1',
            name: 'Transfer Certificate (Formal)',
            description: 'Standard CBSE/State board TC format with numbered fields.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 },
                orientation: 'portrait',
                backgroundColor: '#fffff8',
                elements: [
                    { id: 'border', type: 'shape', shapeType: 'rectangle', x: 25, y: 25, width: 744, height: 1073, backgroundColor: 'transparent', borderColor: '#2f855a', borderWidth: 3, zIndex: 0 },
                    { id: 'border-inner', type: 'shape', shapeType: 'rectangle', x: 32, y: 32, width: 730, height: 1059, backgroundColor: 'transparent', borderColor: '#2f855a', borderWidth: 1, zIndex: 0 },
                    { id: 'logo', type: 'image', url: '{{schoolLogo}}', x: 60, y: 50, width: 80, height: 80, zIndex: 2 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 160, y: 55, width: 474, height: 40, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'school-addr', type: 'text', content: '{{schoolAddress}}', x: 160, y: 90, width: 474, height: 22, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'title-bg', type: 'shape', shapeType: 'rectangle', x: 250, y: 135, width: 294, height: 38, backgroundColor: '#f0fff4', borderColor: '#2f855a', borderWidth: 2, zIndex: 0 },
                    { id: 'title', type: 'text', content: 'TRANSFER CERTIFICATE', x: 252, y: 139, width: 290, height: 32, fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#2f855a', zIndex: 1 },
                    { id: 'tc-no-label', type: 'text', content: 'TC No:', x: 60, y: 190, width: 80, height: 22, fontSize: 13, fontWeight: 'bold', color: '#1a202c', zIndex: 1 },
                    { id: 'tc-no-val', type: 'text', content: '{{tcNumber}}', x: 140, y: 190, width: 150, height: 22, fontSize: 13, color: '#2d3748', zIndex: 1 },
                    { id: 'date-label', type: 'text', content: 'Date:', x: 550, y: 190, width: 50, height: 22, fontSize: 13, fontWeight: 'bold', color: '#1a202c', zIndex: 1 },
                    { id: 'date-val', type: 'text', content: '{{issueDate}}', x: 600, y: 190, width: 130, height: 22, fontSize: 13, color: '#2d3748', zIndex: 1 },
                    ...buildLabelValueRows(TC_FIELDS, 230, 60, 420, 350, 310, 38, 13),
                    { id: 'remarks-label', type: 'text', content: 'Remarks:', x: 60, y: 692, width: 100, height: 30, fontSize: 13, fontWeight: 'bold', color: '#1a202c', zIndex: 1 },
                    { id: 'remarks-val', type: 'text', content: '{{remarks}}', x: 160, y: 692, width: 570, height: 30, fontSize: 13, color: '#2d3748', zIndex: 1 },
                    { id: 'sig-line', type: 'shape', shapeType: 'rectangle', x: 520, y: 950, width: 200, height: 1, backgroundColor: '#4a5568', zIndex: 1 },
                    { id: 'sig-img', type: 'image', url: '{{principalSignature}}', x: 545, y: 900, width: 150, height: 45, zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: "Principal's Signature", x: 520, y: 955, width: 200, height: 20, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'stamp', type: 'image', url: '{{schoolStamp}}', x: 100, y: 890, width: 100, height: 100, zIndex: 1 },
                ]
            }
        }
    ],

    // ── Character Certificate ──
    character: [
        {
            id: 'char-formal-1',
            name: 'Character Certificate (Formal)',
            description: 'Standard character certificate with formal paragraph.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 },
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'border', type: 'shape', shapeType: 'rectangle', x: 30, y: 30, width: 734, height: 1063, backgroundColor: 'transparent', borderColor: '#2b6cb0', borderWidth: 3, zIndex: 0 },
                    { id: 'logo', type: 'image', url: '{{schoolLogo}}', x: 60, y: 50, width: 80, height: 80, zIndex: 2 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 160, y: 55, width: 474, height: 40, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'school-addr', type: 'text', content: '{{schoolAddress}}', x: 160, y: 90, width: 474, height: 22, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'line-top', type: 'shape', shapeType: 'rectangle', x: 60, y: 125, width: 674, height: 2, backgroundColor: '#2b6cb0', zIndex: 1 },
                    { id: 'title', type: 'text', content: 'CHARACTER CERTIFICATE', x: 197, y: 150, width: 400, height: 40, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'ref-label', type: 'text', content: 'Ref No: {{certificateNumber}}', x: 60, y: 210, width: 300, height: 22, fontSize: 13, color: '#4a5568', zIndex: 1 },
                    { id: 'date-label', type: 'text', content: 'Date: {{issueDate}}', x: 500, y: 210, width: 230, height: 22, fontSize: 13, textAlign: 'right', color: '#4a5568', zIndex: 1 },
                    { id: 'body', type: 'text', content: 'This is to certify that {{studentName}}, Son/Daughter of {{fatherName}}, is/was a bonafide student of this institution. He/She was studying in Class {{class}}, Section {{section}}.\n\nDuring his/her stay in the school, his/her conduct and character have been found to be {{conduct}}.\n\nThis certificate is issued on his/her request for the purpose of {{purpose}}.', x: 60, y: 260, width: 674, height: 300, fontSize: 15, color: '#2d3748', zIndex: 1, lineHeight: 2.0 },
                    { id: 'wish', type: 'text', content: 'We wish him/her all the best for future endeavors.', x: 60, y: 550, width: 674, height: 30, fontSize: 15, color: '#2d3748', zIndex: 1 },
                    { id: 'sig-line', type: 'shape', shapeType: 'rectangle', x: 520, y: 900, width: 200, height: 1, backgroundColor: '#4a5568', zIndex: 1 },
                    { id: 'sig-img', type: 'image', url: '{{principalSignature}}', x: 545, y: 855, width: 150, height: 40, zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: "Principal", x: 520, y: 905, width: 200, height: 20, fontSize: 13, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'stamp', type: 'image', url: '{{schoolStamp}}', x: 100, y: 850, width: 90, height: 90, zIndex: 1 },
                ]
            }
        }
    ],

    // ── Bonafide Certificate ──
    bonafide: [
        {
            id: 'bona-formal-1',
            name: 'Bonafide Certificate (Formal)',
            description: 'Standard bonafide/study certificate.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 },
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'border', type: 'shape', shapeType: 'rectangle', x: 30, y: 30, width: 734, height: 1063, backgroundColor: 'transparent', borderColor: '#6b46c1', borderWidth: 3, zIndex: 0 },
                    { id: 'logo', type: 'image', url: '{{schoolLogo}}', x: 60, y: 50, width: 80, height: 80, zIndex: 2 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 160, y: 55, width: 474, height: 40, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#44337a', zIndex: 1 },
                    { id: 'school-addr', type: 'text', content: '{{schoolAddress}}', x: 160, y: 90, width: 474, height: 22, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'line-top', type: 'shape', shapeType: 'rectangle', x: 60, y: 125, width: 674, height: 2, backgroundColor: '#6b46c1', zIndex: 1 },
                    { id: 'title', type: 'text', content: 'BONAFIDE CERTIFICATE', x: 197, y: 155, width: 400, height: 40, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#44337a', zIndex: 1 },
                    { id: 'ref', type: 'text', content: 'Ref No: {{certificateNumber}}', x: 60, y: 215, width: 300, height: 22, fontSize: 13, color: '#4a5568', zIndex: 1 },
                    { id: 'date', type: 'text', content: 'Date: {{issueDate}}', x: 500, y: 215, width: 230, height: 22, fontSize: 13, textAlign: 'right', color: '#4a5568', zIndex: 1 },
                    { id: 'body', type: 'text', content: 'This is to certify that {{studentName}}, Son/Daughter of {{fatherName}}, bearing Admission No. {{admissionNo}}, is a bonafide student of this institution. He/She is presently studying in Class {{class}}, Section {{section}} for the Academic Year {{academicYear}}.\n\nHis/Her date of birth as per school records is {{dob}}.\n\nThis certificate is issued for the purpose of {{purpose}}.', x: 60, y: 265, width: 674, height: 300, fontSize: 15, color: '#2d3748', zIndex: 1, lineHeight: 2.0 },
                    { id: 'sig-line', type: 'shape', shapeType: 'rectangle', x: 520, y: 900, width: 200, height: 1, backgroundColor: '#4a5568', zIndex: 1 },
                    { id: 'sig-img', type: 'image', url: '{{principalSignature}}', x: 545, y: 855, width: 150, height: 40, zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: "Principal", x: 520, y: 905, width: 200, height: 20, fontSize: 13, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'stamp', type: 'image', url: '{{schoolStamp}}', x: 100, y: 850, width: 90, height: 90, zIndex: 1 },
                ]
            }
        }
    ],

    // ── School Leaving Certificate ──
    'school-leaving': [
        {
            id: 'slc-formal-1',
            name: 'School Leaving Certificate',
            description: 'Formal school leaving certificate with detailed student info.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 },
                orientation: 'portrait',
                backgroundColor: '#fffff8',
                elements: [
                    { id: 'border', type: 'shape', shapeType: 'rectangle', x: 25, y: 25, width: 744, height: 1073, backgroundColor: 'transparent', borderColor: '#9b2c2c', borderWidth: 3, zIndex: 0 },
                    { id: 'logo', type: 'image', url: '{{schoolLogo}}', x: 60, y: 50, width: 80, height: 80, zIndex: 2 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 160, y: 55, width: 474, height: 40, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#742a2a', zIndex: 1 },
                    { id: 'school-addr', type: 'text', content: '{{schoolAddress}}', x: 160, y: 90, width: 474, height: 22, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'title', type: 'text', content: 'SCHOOL LEAVING CERTIFICATE', x: 147, y: 145, width: 500, height: 40, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#9b2c2c', zIndex: 1 },
                    { id: 'slc-no', type: 'text', content: 'SLC No: {{certificateNumber}}', x: 60, y: 200, width: 300, height: 22, fontSize: 13, color: '#4a5568', zIndex: 1 },
                    { id: 'date', type: 'text', content: 'Date: {{issueDate}}', x: 500, y: 200, width: 230, height: 22, fontSize: 13, textAlign: 'right', color: '#4a5568', zIndex: 1 },
                    ...buildLabelValueRows([
                        { label: '1. Name of the Student', placeholder: '{{studentName}}' },
                        { label: "2. Father's Name", placeholder: '{{fatherName}}' },
                        { label: "3. Mother's Name", placeholder: '{{motherName}}' },
                        { label: '4. Date of Birth', placeholder: '{{dob}}' },
                        { label: '5. Admission No.', placeholder: '{{admissionNo}}' },
                        { label: '6. Class at time of leaving', placeholder: '{{class}} - {{section}}' },
                        { label: '7. Date of Leaving', placeholder: '{{dateOfLeaving}}' },
                        { label: '8. Reason for Leaving', placeholder: '{{reason}}' },
                        { label: '9. Conduct & Character', placeholder: '{{conduct}}' },
                    ], 240, 60, 400, 330, 330, 38, 13),
                    { id: 'remarks-l', type: 'text', content: 'Remarks:', x: 60, y: 590, width: 100, height: 28, fontSize: 13, fontWeight: 'bold', color: '#1a202c', zIndex: 1 },
                    { id: 'remarks-v', type: 'text', content: '{{remarks}}', x: 160, y: 590, width: 570, height: 28, fontSize: 13, color: '#2d3748', zIndex: 1 },
                    { id: 'sig-line', type: 'shape', shapeType: 'rectangle', x: 520, y: 950, width: 200, height: 1, backgroundColor: '#4a5568', zIndex: 1 },
                    { id: 'sig-img', type: 'image', url: '{{principalSignature}}', x: 545, y: 905, width: 150, height: 40, zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: "Principal", x: 520, y: 955, width: 200, height: 20, fontSize: 13, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'stamp', type: 'image', url: '{{schoolStamp}}', x: 100, y: 890, width: 90, height: 90, zIndex: 1 },
                ]
            }
        }
    ],

    // ── Competition Certificate ──
    competition: [
        {
            id: 'comp-award-1',
            name: 'Competition Award Certificate',
            description: 'Decorative landscape certificate for competitions.',
            layoutConfig: {
                canvasSize: { width: 1123, height: 794 },
                orientation: 'landscape',
                backgroundColor: '#fffaf0',
                elements: [
                    { id: 'border-o', type: 'shape', shapeType: 'rectangle', x: 20, y: 20, width: 1083, height: 754, backgroundColor: 'transparent', borderColor: '#d69e2e', borderWidth: 5, zIndex: 0 },
                    { id: 'border-i', type: 'shape', shapeType: 'rectangle', x: 30, y: 30, width: 1063, height: 734, backgroundColor: 'transparent', borderColor: '#b7791f', borderWidth: 2, zIndex: 0 },
                    { id: 'logo', type: 'image', url: '{{schoolLogo}}', x: 487, y: 50, width: 70, height: 70, zIndex: 2 },
                    { id: 'school', type: 'text', content: '{{schoolName}}', x: 261, y: 125, width: 600, height: 30, fontSize: 16, textAlign: 'center', color: '#975a16', zIndex: 1 },
                    { id: 'title', type: 'text', content: 'CERTIFICATE OF ACHIEVEMENT', x: 161, y: 160, width: 800, height: 55, fontSize: 42, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Times New Roman', color: '#744210', zIndex: 1 },
                    { id: 'line1', type: 'shape', shapeType: 'rectangle', x: 311, y: 220, width: 500, height: 2, backgroundColor: '#d69e2e', zIndex: 1 },
                    { id: 'pres', type: 'text', content: 'This certificate is proudly presented to', x: 311, y: 235, width: 500, height: 25, fontSize: 16, textAlign: 'center', color: '#718096', zIndex: 1 },
                    { id: 'name', type: 'text', content: '{{studentName}}', x: 161, y: 270, width: 800, height: 50, fontSize: 40, fontWeight: 'bold', textAlign: 'center', fontFamily: 'serif', color: '#2d3748', zIndex: 1 },
                    { id: 'line2', type: 'shape', shapeType: 'rectangle', x: 311, y: 325, width: 500, height: 1, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'class', type: 'text', content: 'Class {{class}} - {{section}}', x: 411, y: 335, width: 300, height: 22, fontSize: 14, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'event-label', type: 'text', content: 'for outstanding achievement in', x: 311, y: 375, width: 500, height: 25, fontSize: 16, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'event', type: 'text', content: '{{eventName}}', x: 211, y: 405, width: 700, height: 40, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#744210', zIndex: 1 },
                    { id: 'pos-label', type: 'text', content: 'Position:', x: 411, y: 455, width: 100, height: 25, fontSize: 14, textAlign: 'right', color: '#4a5568', zIndex: 1 },
                    { id: 'pos', type: 'text', content: '{{position}}', x: 520, y: 455, width: 200, height: 25, fontSize: 16, fontWeight: 'bold', color: '#2d3748', zIndex: 1 },
                    { id: 'date-l', type: 'text', content: 'Date', x: 180, y: 590, width: 150, height: 20, fontSize: 12, textAlign: 'center', color: '#718096', zIndex: 1 },
                    { id: 'date-v', type: 'text', content: '{{issueDate}}', x: 180, y: 565, width: 150, height: 25, fontSize: 14, textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'date-line', type: 'shape', shapeType: 'rectangle', x: 180, y: 585, width: 150, height: 1, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'sig-img', type: 'image', url: '{{principalSignature}}', x: 793, y: 545, width: 150, height: 40, zIndex: 1 },
                    { id: 'sig-line', type: 'shape', shapeType: 'rectangle', x: 793, y: 585, width: 150, height: 1, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'sig-l', type: 'text', content: 'Principal', x: 793, y: 590, width: 150, height: 20, fontSize: 12, textAlign: 'center', color: '#718096', zIndex: 1 },
                    { id: 'qr', type: 'qrcode', content: '{{verificationUrl}}', x: 490, y: 540, width: 80, height: 80, zIndex: 1 },
                ]
            }
        }
    ],

    // ── Custom Certificate (generic templates) ──
    custom: [
        {
            id: 'cert-modern-1',
            name: 'Modern Achievement',
            description: 'A clean, modern certificate for general achievements.',
            layoutConfig: {
                canvasSize: { width: 1123, height: 794 },
                orientation: 'landscape',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'title', type: 'text', content: 'CERTIFICATE OF ACHIEVEMENT', x: 261, y: 100, width: 600, height: 60, fontSize: 48, fontFamily: 'Times New Roman', fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'subtitle', type: 'text', content: 'This certificate is proudly presented to', x: 361, y: 180, width: 400, height: 30, fontSize: 18, fontFamily: 'Arial', textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'student-name', type: 'text', content: '{{studentName}}', x: 261, y: 230, width: 600, height: 50, fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'line-1', type: 'shape', shapeType: 'rectangle', x: 311, y: 280, width: 500, height: 2, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'body-text', type: 'text', content: 'For outstanding performance and dedication in {{class}} during the academic year 2024-2025.', x: 211, y: 310, width: 700, height: 60, fontSize: 16, fontFamily: 'Arial', textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'date-label', type: 'text', content: 'Date', x: 200, y: 550, width: 150, height: 20, fontSize: 14, textAlign: 'center', color: '#718096', zIndex: 1 },
                    { id: 'date-val', type: 'text', content: '{{issueDate}}', x: 200, y: 520, width: 150, height: 30, fontSize: 16, textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'line-date', type: 'shape', shapeType: 'rectangle', x: 200, y: 545, width: 150, height: 1, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: 'Principal Signature', x: 773, y: 550, width: 200, height: 20, fontSize: 14, textAlign: 'center', color: '#718096', zIndex: 1 },
                    { id: 'line-sig', type: 'shape', shapeType: 'rectangle', x: 773, y: 545, width: 200, height: 1, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'qr', type: 'qrcode', content: '{{verificationUrl}}', x: 511, y: 500, width: 100, height: 100, zIndex: 1 },
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
                backgroundColor: '#fffaf0',
                elements: [
                    { id: 'border-outer', type: 'shape', shapeType: 'rectangle', x: 20, y: 20, width: 1083, height: 754, backgroundColor: 'transparent', borderColor: '#d69e2e', borderWidth: 5, zIndex: 0 },
                    { id: 'border-inner', type: 'shape', shapeType: 'rectangle', x: 30, y: 30, width: 1063, height: 734, backgroundColor: 'transparent', borderColor: '#744210', borderWidth: 2, zIndex: 0 },
                    { id: 'title', type: 'text', content: 'Certificate of Appreciation', x: 261, y: 120, width: 600, height: 60, fontSize: 42, fontFamily: 'Times New Roman', fontWeight: 'bold', textAlign: 'center', color: '#744210', zIndex: 1 },
                    { id: 'student-name', type: 'text', content: '{{studentName}}', x: 261, y: 250, width: 600, height: 50, fontSize: 32, fontFamily: 'serif', textAlign: 'center', color: '#2d3748', zIndex: 1 },
                ]
            }
        }
    ],

    // ── Generic certificate (used as fallback for any type not listed above) ──
    certificate: [
        {
            id: 'cert-modern-1',
            name: 'Modern Achievement',
            description: 'A clean, modern certificate for general achievements.',
            layoutConfig: {
                canvasSize: { width: 1123, height: 794 },
                orientation: 'landscape',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'title', type: 'text', content: 'CERTIFICATE OF ACHIEVEMENT', x: 261, y: 100, width: 600, height: 60, fontSize: 48, fontFamily: 'Times New Roman', fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'subtitle', type: 'text', content: 'This certificate is proudly presented to', x: 361, y: 180, width: 400, height: 30, fontSize: 18, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'student-name', type: 'text', content: '{{studentName}}', x: 261, y: 230, width: 600, height: 50, fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'line-1', type: 'shape', shapeType: 'rectangle', x: 311, y: 280, width: 500, height: 2, backgroundColor: '#cbd5e0', zIndex: 1 },
                    { id: 'body-text', type: 'text', content: 'For outstanding performance and dedication in {{class}} during the academic year 2024-2025.', x: 211, y: 310, width: 700, height: 60, fontSize: 16, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'date-val', type: 'text', content: '{{issueDate}}', x: 200, y: 520, width: 150, height: 30, fontSize: 16, textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'qr', type: 'qrcode', content: '{{verificationUrl}}', x: 511, y: 500, width: 100, height: 100, zIndex: 1 },
                ]
            }
        }
    ],

    // ── ID Card ──
    idcard: [
        {
            id: 'id-student-v1',
            name: 'Vertical Student ID',
            description: 'Standard vertical ID card for students.',
            layoutConfig: {
                canvasSize: { width: 638, height: 1011 },
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'header-bg', type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 638, height: 200, backgroundColor: '#3182ce', zIndex: 0 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 20, y: 40, width: 598, height: 40, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#ffffff', zIndex: 1 },
                    { id: 'photo', type: 'image', url: '{{studentPhoto}}', x: 194, y: 120, width: 250, height: 250, borderRadius: 125, zIndex: 2 },
                    { id: 'name', type: 'text', content: '{{studentName}}', x: 20, y: 400, width: 598, height: 40, fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#2d3748', zIndex: 1 },
                    { id: 'role', type: 'text', content: 'STUDENT', x: 20, y: 450, width: 598, height: 30, fontSize: 24, textAlign: 'center', color: '#3182ce', zIndex: 1 },
                    { id: 'details', type: 'text', content: 'Class: {{class}}\nDOB: {{dob}}\nRoll No: {{rollNumber}}', x: 60, y: 520, width: 518, height: 200, fontSize: 20, textAlign: 'left', color: '#4a5568', zIndex: 1 },
                    { id: 'qr', type: 'qrcode', content: '{{verificationUrl}}', x: 219, y: 780, width: 200, height: 200, zIndex: 1 },
                ]
            }
        }
    ],

    // ── Admit Card ──
    admitcard: [
        {
            id: 'admit-detailed',
            name: 'Detailed Exam Admit Card',
            description: 'Comprehensive admit card with photo, schedule table, and instructions.',
            layoutConfig: {
                canvasSize: { width: 794, height: 1123 },
                orientation: 'portrait',
                backgroundColor: '#ffffff',
                elements: [
                    { id: 'school-logo', type: 'image', url: '{{schoolLogo}}', x: 50, y: 40, width: 80, height: 80, zIndex: 1 },
                    { id: 'school-name', type: 'text', content: '{{schoolName}}', x: 150, y: 50, width: 494, height: 40, fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', zIndex: 1 },
                    { id: 'school-address', type: 'text', content: '{{schoolAddress}}', x: 150, y: 85, width: 494, height: 25, fontSize: 12, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'title', type: 'text', content: 'EXAMINATION ADMIT CARD', x: 50, y: 140, width: 694, height: 40, fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#ffffff', backgroundColor: '#2563eb', zIndex: 1 },
                    { id: 'student-photo', type: 'image', url: '{{studentPhoto}}', x: 620, y: 200, width: 120, height: 140, borderWidth: 2, borderColor: '#cbd5e0', zIndex: 2 },
                    { id: 'label-name', type: 'text', content: 'Student Name:', x: 60, y: 210, width: 150, height: 25, fontSize: 14, fontWeight: 'bold', color: '#2d3748', zIndex: 1 },
                    { id: 'value-name', type: 'text', content: '{{studentName}}', x: 220, y: 210, width: 350, height: 25, fontSize: 14, color: '#4a5568', zIndex: 1 },
                    { id: 'label-father', type: 'text', content: "Father's Name:", x: 60, y: 240, width: 150, height: 25, fontSize: 14, fontWeight: 'bold', color: '#2d3748', zIndex: 1 },
                    { id: 'value-father', type: 'text', content: '{{fatherName}}', x: 220, y: 240, width: 350, height: 25, fontSize: 14, color: '#4a5568', zIndex: 1 },
                    { id: 'label-class', type: 'text', content: 'Class / Section:', x: 60, y: 270, width: 150, height: 25, fontSize: 14, fontWeight: 'bold', color: '#2d3748', zIndex: 1 },
                    { id: 'value-class', type: 'text', content: '{{class}} - {{section}}', x: 220, y: 270, width: 350, height: 25, fontSize: 14, color: '#4a5568', zIndex: 1 },
                    { id: 'label-roll', type: 'text', content: 'Roll Number:', x: 60, y: 300, width: 150, height: 25, fontSize: 14, fontWeight: 'bold', color: '#2d3748', zIndex: 1 },
                    { id: 'value-roll', type: 'text', content: '{{rollNumber}}', x: 220, y: 300, width: 350, height: 25, fontSize: 14, color: '#4a5568', zIndex: 1 },
                    { id: 'schedule-title', type: 'text', content: 'EXAMINATION SCHEDULE', x: 50, y: 360, width: 694, height: 35, fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', backgroundColor: '#e6f2ff', zIndex: 1 },
                    { id: 'instructions-title', type: 'text', content: 'INSTRUCTIONS FOR CANDIDATES', x: 50, y: 660, width: 694, height: 35, fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1a365d', backgroundColor: '#e6f2ff', zIndex: 1 },
                    { id: 'instructions', type: 'text', content: '1. Bring this admit card to the examination hall.\n2. Reach 30 minutes before the exam.\n3. Mobile phones and electronic devices are prohibited.\n4. Unfair means will result in cancellation.\n5. Carry your own stationery.', x: 70, y: 710, width: 654, height: 120, fontSize: 11, textAlign: 'left', color: '#2d3748', zIndex: 1 },
                    { id: 'sig', type: 'image', url: '{{principalSignature}}', x: 550, y: 860, width: 150, height: 50, zIndex: 1 },
                    { id: 'sig-label', type: 'text', content: "Principal's Signature", x: 550, y: 915, width: 150, height: 20, fontSize: 11, textAlign: 'center', color: '#4a5568', zIndex: 1 },
                    { id: 'border', type: 'shape', shapeType: 'rectangle', x: 30, y: 30, width: 734, height: 1063, backgroundColor: 'transparent', borderWidth: 3, borderColor: '#2563eb', zIndex: 0 },
                ]
            }
        }
    ]
};
