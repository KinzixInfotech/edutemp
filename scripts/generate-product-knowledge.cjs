#!/usr/bin/env node

/**
 * Auto-Generate Product Knowledge from Prisma Schema
 * 
 * Parses prisma/schema.prisma and automatically categorizes models
 * based on naming patterns. No manual mapping required!
 * 
 * Usage: npm run generate-knowledge
 */

const fs = require('fs');
const path = require('path');

// Auto-categorization patterns (regex patterns for model names)
const CATEGORY_PATTERNS = [
    { pattern: /^(Fee|Payment|Receipt|Invoice|Billing|Transaction)/i, category: 'fees' },
    { pattern: /(Fee|Payment|Receipt)$/i, category: 'fees' },

    { pattern: /^(Student|Parent|Guardian|Class|Section|Academic|Subject)/i, category: 'student_management' },
    { pattern: /(Student|Parent)$/i, category: 'student_management' },

    { pattern: /^(Attendance|Leave|Absent|Present)/i, category: 'attendance' },
    { pattern: /(Attendance|Leave)$/i, category: 'attendance' },

    { pattern: /^(Exam|Marks|Grade|Result|ReportCard|Grading)/i, category: 'exams' },
    { pattern: /(Exam|Marks|Grade)$/i, category: 'exams' },

    { pattern: /^(Vehicle|Route|Bus|Transport|Driver)/i, category: 'transport' },
    { pattern: /(Vehicle|Route|Bus|Transport)$/i, category: 'transport' },

    { pattern: /^(Library|Book|Genre|Librarian)/i, category: 'library' },
    { pattern: /(Book|Library)$/i, category: 'library' },

    { pattern: /^(Inventory|Stock|Purchase|Store)/i, category: 'inventory' },
    { pattern: /(Inventory|Stock|Sale)$/i, category: 'inventory' },

    { pattern: /^(Payroll|Salary|Payslip|Staff)/i, category: 'payroll' },
    { pattern: /(Payroll|Salary|Payslip)$/i, category: 'payroll' },

    { pattern: /^(Teaching|NonTeaching|Admin|Principal|Director|Accountant)/i, category: 'staff_management' },
    { pattern: /(Staff)$/i, category: 'staff_management' },

    { pattern: /^(Certificate|Signature|Stamp|Document|IdCard|AdmitCard)/i, category: 'certificates' },
    { pattern: /(Certificate|Template|Card)$/i, category: 'certificates' },

    { pattern: /^(Notice|Sms|Notification|Push|Message)/i, category: 'communication' },
    { pattern: /(Notification|Message|Notice)$/i, category: 'communication' },

    { pattern: /^(Homework|Assignment)/i, category: 'homework' },
    { pattern: /(Homework|Assignment|Submission)$/i, category: 'homework' },

    { pattern: /^(Time|Timetable|Schedule|Period|Shift)/i, category: 'timetable' },
    { pattern: /(Timetable|Slot|Shift)$/i, category: 'timetable' },

    { pattern: /^(Calendar|Event|Holiday|Vacation)/i, category: 'calendar' },
    { pattern: /(Calendar|Event|Holiday)$/i, category: 'calendar' },

    { pattern: /^(Alumni)/i, category: 'alumni' },

    { pattern: /^(Partner|Lead|Commission|Payout|Referral)/i, category: 'partner_program' },
    { pattern: /(Partner|Lead|Commission|Payout)$/i, category: 'partner_program' },

    { pattern: /^(SchoolPublic|Admission|Rating|Achievement|Facility|Badge|Inquiry)/i, category: 'school_explorer' },
    { pattern: /(Rating|Inquiry|Achievement|Facility|Badge)$/i, category: 'school_explorer' },

    { pattern: /^(Ai|Insight|Analytics)/i, category: 'ai_insights' },
    { pattern: /(Insight|Cache|Usage)$/i, category: 'ai_insights' },

    { pattern: /^(Form|Application|Stage)/i, category: 'admission' },
    { pattern: /(Application|Form)$/i, category: 'admission' },

    { pattern: /^(Media|Gallery|Upload|Photo|Video)/i, category: 'media_library' },
    { pattern: /(Gallery|Media|Upload)$/i, category: 'media_library' },

    { pattern: /^(Report)/i, category: 'reports' },
    { pattern: /(Report|Analytics)$/i, category: 'reports' },

    { pattern: /^(School|User|Master|Setting|Import|Config|Qr|Pdf)/i, category: 'platform' },
    { pattern: /(Settings|Config|History)$/i, category: 'platform' },
];

// Feature descriptions
const FEATURE_DESCRIPTIONS = {
    student_management: 'Comprehensive student database with profiles, academic history, parent linking, and lifecycle management.',
    fees: 'End-to-end fee management with online payments, installments, receipts, and analytics.',
    attendance: 'Smart attendance tracking with geo-fencing, leave management, and parent notifications.',
    exams: 'Complete exam lifecycle from scheduling to report cards with analytics.',
    transport: 'Transport operations with GPS tracking, route planning, and driver apps.',
    library: 'Library management with catalog, issue/return tracking, and fine calculation.',
    inventory: 'Inventory management with stock tracking, purchase orders, and sales.',
    payroll: 'Payroll processing with salary structures, deductions, and audit trails.',
    staff_management: 'Staff lifecycle management for teaching and non-teaching staff.',
    certificates: 'Digital certificate generation with templates, signatures, and QR verification.',
    communication: 'Multi-channel communication with notices, SMS, and push notifications.',
    homework: 'Homework assignment and tracking with due dates and parent visibility.',
    timetable: 'Intelligent timetable creation with conflict detection.',
    calendar: 'Academic calendar with events, holidays, and exam schedules.',
    alumni: 'Alumni tracking and engagement.',
    partner_program: 'Partner management with leads, commissions, and payouts.',
    school_explorer: 'Public school discovery platform with profiles and ratings.',
    ai_insights: 'AI-powered dashboard with intelligent insights and predictions.',
    admission: 'Digital admission pipeline with forms, workflows, and tracking.',
    media_library: 'Centralized media management for photos, videos, and documents.',
    reports: 'Comprehensive reporting and analytics dashboard.',
    platform: 'Core platform infrastructure and settings.',
};

/**
 * Auto-detect category based on model name patterns
 */
function detectCategory(modelName) {
    for (const { pattern, category } of CATEGORY_PATTERNS) {
        if (pattern.test(modelName)) {
            return category;
        }
    }
    return null; // Uncategorized
}

function parseSchema(schemaPath) {
    const content = fs.readFileSync(schemaPath, 'utf-8');

    // Extract model names using regex
    const modelRegex = /^model\s+(\w+)\s*\{/gm;
    const models = [];
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
        models.push(match[1]);
    }

    return models;
}

function categorizeModels(models) {
    const features = {};
    const uncategorized = [];

    for (const model of models) {
        const category = detectCategory(model);
        if (category) {
            if (!features[category]) {
                features[category] = [];
            }
            features[category].push(model);
        } else {
            uncategorized.push(model);
        }
    }

    return { features, uncategorized };
}

function generateSchemaFeatures(models, features) {
    return {
        lastGenerated: new Date().toISOString(),
        modelCount: models.length,
        featureCount: Object.keys(features).length,
        categorizedCount: models.length - (features['uncategorized']?.length || 0),
        features: features,
        capabilities: Object.entries(features).map(([id, modelList]) => ({
            id,
            name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: FEATURE_DESCRIPTIONS[id] || `Manages ${modelList.slice(0, 3).join(', ')}${modelList.length > 3 ? '...' : ''}`,
            modelCount: modelList.length,
            models: modelList,
        })),
    };
}

function main() {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const knowledgePath = path.join(process.cwd(), 'public', 'product-knowledge.json');

    console.log('🔍 Parsing Prisma schema...');

    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema file not found:', schemaPath);
        process.exit(1);
    }

    const models = parseSchema(schemaPath);
    console.log(`✅ Found ${models.length} models`);

    const { features, uncategorized } = categorizeModels(models);
    const categorizedCount = models.length - uncategorized.length;

    console.log(`📦 Auto-categorized ${categorizedCount}/${models.length} models into ${Object.keys(features).length} features`);

    if (uncategorized.length > 0) {
        console.log(`⚠️  ${uncategorized.length} uncategorized:`, uncategorized.slice(0, 5).join(', '), uncategorized.length > 5 ? '...' : '');
    }

    // Load existing knowledge
    let knowledge = {};
    if (fs.existsSync(knowledgePath)) {
        knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
    }

    // Add schema features
    knowledge.schemaFeatures = generateSchemaFeatures(models, features);

    // Save updated knowledge
    fs.writeFileSync(knowledgePath, JSON.stringify(knowledge, null, 4));
    console.log('✅ Updated product-knowledge.json');
}

main();
