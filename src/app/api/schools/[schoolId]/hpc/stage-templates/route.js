import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Default templates for each NEP stage
const DEFAULT_TEMPLATES = {
    FOUNDATIONAL: {
        name: 'Foundational Stage (Pre-primary to Class 2)',
        academicWeight: 0.30,
        selWeight: 0.40,
        activityWeight: 0.30,
        showMarks: false,
        showGrades: true,
        showPercentages: false,
        categories: {
            academic: ['Listening', 'Speaking', 'Pre-reading', 'Pre-writing', 'Numeracy'],
            sel: ['Curiosity', 'Social Interaction', 'Following Instructions', 'Sharing'],
            activity: ['Play Participation', 'Motor Skills', 'Creative Expression']
        }
    },
    PREPARATORY: {
        name: 'Preparatory Stage (Class 3 to 5)',
        academicWeight: 0.40,
        selWeight: 0.30,
        activityWeight: 0.30,
        showMarks: false,
        showGrades: true,
        showPercentages: false,
        categories: {
            academic: ['Reading Comprehension', 'Written Expression', 'Problem Solving', 'Concept Understanding'],
            sel: ['Collaboration', 'Communication', 'Empathy', 'Responsibility'],
            activity: ['Sports', 'Arts', 'Group Projects']
        }
    },
    MIDDLE: {
        name: 'Middle Stage (Class 6 to 8)',
        academicWeight: 0.50,
        selWeight: 0.25,
        activityWeight: 0.25,
        showMarks: true,
        showGrades: true,
        showPercentages: true,
        categories: {
            academic: ['Analytical Thinking', 'Application', 'Research Skills', 'Subject Mastery'],
            sel: ['Leadership', 'Critical Thinking', 'Self-Awareness', 'Decision Making'],
            activity: ['Clubs', 'Competitions', 'Community Service']
        }
    },
    SECONDARY: {
        name: 'Secondary Stage (Class 9 to 12)',
        academicWeight: 0.60,
        selWeight: 0.20,
        activityWeight: 0.20,
        showMarks: true,
        showGrades: true,
        showPercentages: true,
        categories: {
            academic: ['Subject Expertise', 'Independent Learning', 'Research & Projects', 'Exam Performance'],
            sel: ['Ethics & Values', 'Career Orientation', 'Self-Reflection', 'Citizenship'],
            activity: ['Leadership Roles', 'Internships', 'Portfolio Work']
        }
    }
};

// GET - Fetch all stage templates for a school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    try {
        const templates = await prisma.hPCStageTemplate.findMany({
            where: { schoolId },
            orderBy: { stage: 'asc' }
        });

        return NextResponse.json({
            success: true,
            templates,
            defaultTemplates: DEFAULT_TEMPLATES
        });
    } catch (err) {
        console.error("Error fetching stage templates:", err);
        return NextResponse.json(
            { error: "Failed to fetch stage templates", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Create or update a stage template
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();

    const {
        stage,
        name,
        academicWeight,
        selWeight,
        activityWeight,
        showMarks,
        showGrades,
        showPercentages,
        categories,
        gradeScale,
        isActive
    } = body;

    if (!schoolId || !stage) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate stage
    const validStages = ['FOUNDATIONAL', 'PREPARATORY', 'MIDDLE', 'SECONDARY'];
    if (!validStages.includes(stage)) {
        return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 });
    }

    // Validate weights sum to 1.0 (with tolerance)
    const totalWeight = (academicWeight || 0) + (selWeight || 0) + (activityWeight || 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        return NextResponse.json(
            { error: 'Weights must sum to 1.0', currentSum: totalWeight },
            { status: 400 }
        );
    }

    try {
        const template = await prisma.hPCStageTemplate.upsert({
            where: {
                schoolId_stage: { schoolId, stage }
            },
            update: {
                name: name || DEFAULT_TEMPLATES[stage]?.name,
                academicWeight: academicWeight ?? 0.4,
                selWeight: selWeight ?? 0.3,
                activityWeight: activityWeight ?? 0.3,
                showMarks: showMarks ?? false,
                showGrades: showGrades ?? true,
                showPercentages: showPercentages ?? false,
                categories: categories || DEFAULT_TEMPLATES[stage]?.categories,
                gradeScale: gradeScale || null,
                isActive: isActive ?? true
            },
            create: {
                schoolId,
                stage,
                name: name || DEFAULT_TEMPLATES[stage]?.name,
                academicWeight: academicWeight ?? DEFAULT_TEMPLATES[stage]?.academicWeight ?? 0.4,
                selWeight: selWeight ?? DEFAULT_TEMPLATES[stage]?.selWeight ?? 0.3,
                activityWeight: activityWeight ?? DEFAULT_TEMPLATES[stage]?.activityWeight ?? 0.3,
                showMarks: showMarks ?? DEFAULT_TEMPLATES[stage]?.showMarks ?? false,
                showGrades: showGrades ?? DEFAULT_TEMPLATES[stage]?.showGrades ?? true,
                showPercentages: showPercentages ?? DEFAULT_TEMPLATES[stage]?.showPercentages ?? false,
                categories: categories || DEFAULT_TEMPLATES[stage]?.categories,
                gradeScale: gradeScale || null,
                isActive: isActive ?? true
            }
        });

        return NextResponse.json({
            success: true,
            message: "Stage template saved successfully",
            template
        });
    } catch (err) {
        console.error("Error saving stage template:", err);
        return NextResponse.json(
            { error: "Failed to save stage template", message: err.message },
            { status: 500 }
        );
    }
}

// PUT - Initialize all default templates for a school
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    try {
        const templates = [];

        for (const [stage, defaults] of Object.entries(DEFAULT_TEMPLATES)) {
            const template = await prisma.hPCStageTemplate.upsert({
                where: {
                    schoolId_stage: { schoolId, stage }
                },
                update: {}, // Don't overwrite existing
                create: {
                    schoolId,
                    stage,
                    name: defaults.name,
                    academicWeight: defaults.academicWeight,
                    selWeight: defaults.selWeight,
                    activityWeight: defaults.activityWeight,
                    showMarks: defaults.showMarks,
                    showGrades: defaults.showGrades,
                    showPercentages: defaults.showPercentages,
                    categories: defaults.categories
                }
            });
            templates.push(template);
        }

        return NextResponse.json({
            success: true,
            message: "Default templates initialized",
            templates
        });
    } catch (err) {
        console.error("Error initializing templates:", err);
        return NextResponse.json(
            { error: "Failed to initialize templates", message: err.message },
            { status: 500 }
        );
    }
}
