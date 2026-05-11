import {
    buildResolvedTemplateConfig,
    extractTemplatePlaceholders,
    normalizeTemplateLayout,
} from '@/lib/shared-field-resolver';

export const TEMPLATE_RENDERER_VERSION = 'fixed-layout-v1';
export const TEMPLATE_DPI = 96;
export const TEMPLATE_SAFE_ZONE = 24;

export const SUPPORTED_TEMPLATE_FONTS = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Inter',
    'Roboto',
    'Poppins',
    'Montserrat',
    'Open Sans',
    'Lato',
    'Playfair Display',
    'Merriweather',
    'Nunito',
    'Raleway',
    'Outfit',
    'Source Sans Pro',
    'Ubuntu',
    'Oswald',
    'Quicksand',
];

export function resolvePdfFontFamily(fontFamily = '') {
    const normalized = String(fontFamily || '').toLowerCase();
    if (normalized.includes('times') || normalized.includes('georgia') || normalized.includes('garamond') || normalized.includes('merriweather') || normalized.includes('playfair')) {
        return 'times';
    }
    if (normalized.includes('courier')) return 'courier';
    return 'helvetica';
}

export const TEMPLATE_SAMPLE_CONTEXT = {
    student: {
        name: 'Aarav Sharma',
        admissionNo: 'ADM-2026-0142',
        className: 'Class X',
        class: { className: 'Class X' },
        section: { sectionName: 'A' },
        rollNumber: '24',
        dob: '2011-04-18',
        fatherName: 'Rajesh Sharma',
        motherName: 'Priya Sharma',
        parentContact: '+91 98765 43210',
    },
    parent: {
        fatherName: 'Rajesh Sharma',
        motherName: 'Priya Sharma',
        phone: '+91 98765 43210',
    },
    school: {
        name: 'Mahatma Gandhi Memorial School',
        address: 'Sector 12, New Delhi, India',
        academicYearName: '2026-27',
    },
    exam: {
        name: 'Annual Examination 2026',
        title: 'Annual Examination 2026',
        examDate: '18 Mar 2026',
        center: 'Main Campus',
        scheduleText: '18 Mar | Mathematics | 10:00 AM - 1:00 PM | 80',
    },
    result: {
        marks: '482/500',
        grade: 'A+',
        percentage: '96.4%',
    },
    form: {
        issueDate: '11 May 2026',
        validUntil: '31 Mar 2027',
        seatNumber: 'B-24',
        center: 'Main Campus',
    },
    meta: {
        certificateNumber: 'CERT-2026-00142',
        verificationUrl: 'https://edubreezy.com/verify/CERT-2026-00142',
    },
    assets: {
        schoolLogo: 'https://placehold.co/120x120?text=Logo',
        studentPhoto: 'https://placehold.co/120x150?text=Photo',
        principalSignature: 'https://placehold.co/220x80?text=Signature',
        classTeacherSignature: 'https://placehold.co/220x80?text=Signature',
        schoolStamp: 'https://placehold.co/120x120?text=Stamp',
    },
};

function rectsOverlap(a, b) {
    return a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y;
}

export function validateTemplateLayout(layoutConfig = {}) {
    const layout = normalizeTemplateLayout(layoutConfig);
    const issues = [];
    const warnings = [];
    const elements = layout.elements || [];

    if (!layout.canvasWidth || !layout.canvasHeight) {
        issues.push('Canvas width and height are required.');
    }

    elements.forEach((element, index) => {
        const label = element.id || `${element.type || 'element'} #${index + 1}`;
        const x = Number(element.x) || 0;
        const y = Number(element.y) || 0;
        const width = Number(element.width) || 0;
        const height = Number(element.height) || 0;

        if (width <= 0 || height <= 0) issues.push(`${label} has invalid width or height.`);
        if (x < 0 || y < 0 || x + width > layout.canvasWidth || y + height > layout.canvasHeight) {
            issues.push(`${label} is outside the page boundary.`);
        }
        if (x < TEMPLATE_SAFE_ZONE || y < TEMPLATE_SAFE_ZONE || x + width > layout.canvasWidth - TEMPLATE_SAFE_ZONE || y + height > layout.canvasHeight - TEMPLATE_SAFE_ZONE) {
            warnings.push(`${label} is close to the printable edge.`);
        }
        if (element.type === 'text' && element.fontFamily && !SUPPORTED_TEMPLATE_FONTS.includes(element.fontFamily)) {
            warnings.push(`${label} uses an unmanaged font: ${element.fontFamily}.`);
        }
        if ((element.type === 'image' || element.type === 'signature') && !element.url && !element.mapping) {
            warnings.push(`${label} has no image source or mapping.`);
        }
    });

    elements.forEach((element, index) => {
        if (!['text', 'image', 'signature', 'qrcode', 'barcode'].includes(element.type)) return;
        const current = {
            id: element.id,
            x: Number(element.x) || 0,
            y: Number(element.y) || 0,
            width: Number(element.width) || 0,
            height: Number(element.height) || 0,
        };
        elements.slice(index + 1).forEach((other) => {
            if (!['text', 'image', 'signature', 'qrcode', 'barcode'].includes(other.type)) return;
            const next = {
                id: other.id,
                x: Number(other.x) || 0,
                y: Number(other.y) || 0,
                width: Number(other.width) || 0,
                height: Number(other.height) || 0,
            };
            if (rectsOverlap(current, next)) {
                warnings.push(`${current.id || 'Element'} overlaps ${next.id || 'another element'}.`);
            }
        });
    });

    return {
        valid: issues.length === 0,
        issues,
        warnings,
        placeholders: extractTemplatePlaceholders(elements),
    };
}

export function buildSamplePreviewLayout(layoutConfig = {}) {
    return buildResolvedTemplateConfig({
        layoutConfig,
        context: TEMPLATE_SAMPLE_CONTEXT,
    });
}
