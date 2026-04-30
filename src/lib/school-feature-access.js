import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    buildBillingSummary,
    getFeatureAccessForPath,
    getFeatureCatalogForAdmin,
    normalizeFeatureOverrides,
    normalizeFeaturePlan,
    previewFeatureUpdate,
    resolveFeatureState,
} from "@/lib/school-feature-config";

export const SCHOOL_FEATURE_ERROR_CODES = {
    FEATURE_DISABLED: "SCHOOL_FEATURE_DISABLED",
};

export function getSchoolFeatureControlConfig(school) {
    const control = school?.websiteConfig?.featureControl;

    return {
        plan: normalizeFeaturePlan(control?.plan),
        overrides: normalizeFeatureOverrides(control?.overrides),
    };
}

export function getSchoolFeatureStateFromSchool(school) {
    const control = getSchoolFeatureControlConfig(school);
    const state = resolveFeatureState(control);

    return {
        ...state,
        control,
        catalog: getFeatureCatalogForAdmin(),
        billing: buildBillingSummary({
            plan: state.plan,
            activeStudentCount: school?._count?.Student ?? school?.Student?.length ?? 0,
        }),
    };
}

export async function getSchoolFeatureStateById(schoolId) {
    if (!schoolId) {
        return null;
    }

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
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
        return null;
    }

    return {
        school,
        state: getSchoolFeatureStateFromSchool(school),
    };
}

export function buildSchoolFeatureAccessErrorResponse(featureAccess) {
    return NextResponse.json(
        {
            error: `${featureAccess.label} is not enabled for this school.`,
            code: SCHOOL_FEATURE_ERROR_CODES.FEATURE_DISABLED,
            featureKey: featureAccess.key,
            featureLabel: featureAccess.label,
            plan: featureAccess.plan,
            dependencies: featureAccess.missingDependencies || [],
        },
        { status: 403 },
    );
}

export async function getSchoolFeatureAccessSnapshot({
    schoolId,
    pathname,
    bypass = false,
}) {
    if (!schoolId || !pathname || bypass) {
        return {
            ok: true,
            feature: null,
            school: null,
            state: null,
        };
    }

    const resolved = await getSchoolFeatureStateById(schoolId);

    if (!resolved) {
        return {
            ok: false,
            response: NextResponse.json({ error: "School not found" }, { status: 404 }),
        };
    }

    const feature = getFeatureAccessForPath(pathname, resolved.state);

    if (!feature || feature.enabled) {
        return {
            ok: true,
            feature,
            school: resolved.school,
            state: resolved.state,
        };
    }

    return {
        ok: false,
        feature: {
            ...feature,
            plan: resolved.state.plan,
        },
        school: resolved.school,
        state: resolved.state,
        response: buildSchoolFeatureAccessErrorResponse({
            ...feature,
            plan: resolved.state.plan,
        }),
    };
}

export function mergeSchoolFeatureControlIntoWebsiteConfig(websiteConfig, nextControl) {
    const existingConfig = typeof websiteConfig === "object" && websiteConfig !== null ? websiteConfig : {};

    return {
        ...existingConfig,
        featureControl: {
            plan: normalizeFeaturePlan(nextControl?.plan),
            overrides: normalizeFeatureOverrides(nextControl?.overrides),
        },
    };
}

export async function updateSchoolFeatureControl({
    schoolId,
    plan,
    overrides,
}) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
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
        throw new Error("School not found");
    }

    const nextState = resolveFeatureState({
        plan,
        overrides,
    });

    const nextWebsiteConfig = mergeSchoolFeatureControlIntoWebsiteConfig(school.websiteConfig, {
        plan: nextState.plan,
        overrides: nextState.overrides,
    });

    const updatedSchool = await prisma.school.update({
        where: { id: schoolId },
        data: {
            websiteConfig: nextWebsiteConfig,
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

    return {
        school: updatedSchool,
        state: getSchoolFeatureStateFromSchool(updatedSchool),
    };
}

export function buildFeaturePolicySnapshot({ plan, overrides }) {
    const state = resolveFeatureState({ plan, overrides });

    return {
        plan: state.plan,
        overrides: state.overrides,
        enabledFeatures: state.enabledFeatures,
        disabledFeatures: state.disabledFeatures,
        dependencyGraph: state.features.map((feature) => ({
            key: feature.key,
            dependencies: feature.dependencies,
            missingDependencies: feature.missingDependencies,
        })),
    };
}

export { previewFeatureUpdate };
