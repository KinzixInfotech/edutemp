import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyRoleAccess } from "@/lib/api-auth";
import {
    getSchoolFeatureStateFromSchool,
    mergeSchoolFeatureControlIntoWebsiteConfig,
} from "@/lib/school-feature-access";
import {
    buildBillingSummary,
    getAllFeatureKeys,
    getFeatureCatalogForAdmin,
    normalizeFeatureOverrides,
    normalizeFeaturePlan,
    previewFeatureUpdate,
    resolveFeatureState,
} from "@/lib/school-feature-config";

const payloadSchema = z.object({
    plan: z.enum(["BASE", "PRO"]),
    overrides: z.object({
        enabled: z.array(z.string()).default([]),
        disabled: z.array(z.string()).default([]),
    }).default({ enabled: [], disabled: [] }),
});

function expandDisabledOverrides(plan, overrides) {
    let nextOverrides = normalizeFeatureOverrides(overrides);

    for (const featureKey of [...nextOverrides.disabled]) {
        const preview = previewFeatureUpdate({
            plan,
            overrides: nextOverrides,
            action: "disable",
            featureKey,
        });

        nextOverrides = preview.nextOverrides;
    }

    return nextOverrides;
}

function validateRequestedState(plan, overrides) {
    const resolvedState = resolveFeatureState({ plan, overrides });
    const explicitlyEnabledButBlocked = resolvedState.features
        .filter((feature) => overrides.enabled.includes(feature.key) && !feature.enabled)
        .map((feature) => ({
            key: feature.key,
            label: feature.label,
            missingDependencies: feature.missingDependencies,
        }));

    return {
        resolvedState,
        explicitlyEnabledButBlocked,
    };
}

export async function GET(request, props) {
    const auth = await verifyRoleAccess(request, ["SUPER_ADMIN"]);
    if (auth.error) {
        return auth.response;
    }

    const params = await props.params;

    const school = await prisma.school.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            name: true,
            domain: true,
            schoolCode: true,
            websiteConfig: true,
            _count: {
                select: {
                    Student: true,
                },
            },
        },
    });

    if (!school) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const featureState = getSchoolFeatureStateFromSchool(school);

    return NextResponse.json({
        school: {
            id: school.id,
            name: school.name,
            domain: school.domain,
            schoolCode: school.schoolCode,
        },
        plan: featureState.plan,
        overrides: featureState.overrides,
        features: featureState.features,
        catalog: getFeatureCatalogForAdmin(),
        billing: buildBillingSummary({
            plan: featureState.plan,
            activeStudentCount: school._count.Student,
        }),
        policy: {
            noInvalidDependencies: true,
            disablingCascadesToDependents: true,
            enableRequiresDependencies: true,
        },
    });
}

export async function PATCH(request, props) {
    const auth = await verifyRoleAccess(request, ["SUPER_ADMIN"]);
    if (auth.error) {
        return auth.response;
    }

    const params = await props.params;
    const body = payloadSchema.parse(await request.json());
    const validKeys = new Set(getAllFeatureKeys());

    const unknownKeys = [...body.overrides.enabled, ...body.overrides.disabled]
        .filter((key) => !validKeys.has(key));

    if (unknownKeys.length > 0) {
        return NextResponse.json({
            error: "Unknown feature keys supplied.",
            unknownKeys,
        }, { status: 400 });
    }

    const plan = normalizeFeaturePlan(body.plan);
    const expandedOverrides = expandDisabledOverrides(plan, body.overrides);
    const validation = validateRequestedState(plan, expandedOverrides);

    if (validation.explicitlyEnabledButBlocked.length > 0) {
        return NextResponse.json({
            error: "Some features cannot be enabled because required dependencies are disabled.",
            invalidFeatures: validation.explicitlyEnabledButBlocked,
        }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            name: true,
            websiteConfig: true,
            _count: {
                select: {
                    Student: true,
                },
            },
        },
    });

    if (!school) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const updatedSchool = await prisma.school.update({
        where: { id: params.id },
        data: {
            websiteConfig: mergeSchoolFeatureControlIntoWebsiteConfig(school.websiteConfig, {
                plan,
                overrides: expandedOverrides,
            }),
        },
        select: {
            id: true,
            name: true,
            websiteConfig: true,
            _count: {
                select: {
                    Student: true,
                },
            },
        },
    });

    const featureState = getSchoolFeatureStateFromSchool(updatedSchool);

    return NextResponse.json({
        success: true,
        message: `Feature controls updated for ${updatedSchool.name}.`,
        plan: featureState.plan,
        overrides: featureState.overrides,
        features: featureState.features,
        billing: buildBillingSummary({
            plan: featureState.plan,
            activeStudentCount: updatedSchool._count.Student,
        }),
    });
}
