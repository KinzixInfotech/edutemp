export const SCHOOL_FEATURE_PLAN = {
    BASE: "BASE",
    PRO: "PRO",
};

export const PLAN_BILLING = {
    [SCHOOL_FEATURE_PLAN.BASE]: {
        key: SCHOOL_FEATURE_PLAN.BASE,
        label: "BASE",
        pricePerStudent: 10,
        tagline: "Core operations to run a school day to day.",
    },
    [SCHOOL_FEATURE_PLAN.PRO]: {
        key: SCHOOL_FEATURE_PLAN.PRO,
        label: "PRO",
        pricePerStudent: 20,
        tagline: "Advanced monetization, automation, and growth modules.",
    },
};

function createPathMatcher(pattern) {
    const escaped = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/:([A-Za-z0-9_]+)/g, "[^/]+")
        .replace(/\\\*\\\*/g, ".*");

    return new RegExp(`^${escaped}(?:/|$)`, "i");
}

function createMatchers(patterns = []) {
    return patterns.map(createPathMatcher);
}

const FEATURE_DEFINITIONS = [
    {
        key: "school_communication",
        label: "Communication",
        category: "Core Operations",
        description: "Notices, circulars, and school-wide calendars.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/noticeboard",
            "/dashboard/schools/manage-notice",
            "/dashboard/calendar",
        ],
        apiPatterns: [
            "/api/schools/notice",
            "/api/schools/notice/get",
            "/api/notifications",
        ],
    },
    {
        key: "school_app",
        label: "School App & Web",
        category: "Growth & Engagement",
        description: "Carousel, gallery, and school status updates in the app.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/carousel",
            "/dashboard/schools/gallery",
            "/dashboard/schools/status",
        ],
        apiPatterns: [
            "/api/schools/carousel",
            "/api/schools/:schoolId/status",
        ],
    },
    {
        key: "forms",
        label: "Forms",
        category: "Growth & Engagement",
        description: "Custom form builder and structured data capture.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/forms",
        ],
        apiPatterns: [
            "/api/forms",
        ],
    },
    {
        key: "media_library",
        label: "Media Library",
        category: "Growth & Engagement",
        description: "Shared media management for uploads and publishing.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/media-library",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/media",
        ],
    },
    {
        key: "admissions",
        label: "Admissions",
        category: "Core Operations",
        description: "Admissions funnel, forms, applications, and waitlists.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/admissions",
        ],
        apiPatterns: [
            "/api/schools/admissions",
            "/api/schools/:schoolId/admissions",
        ],
    },
    {
        key: "inventory",
        label: "Inventory",
        category: "Advanced Operations",
        description: "Stock, purchase orders, and inventory transactions.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/inventory",
        ],
        apiPatterns: [
            "/api/schools/inventory",
        ],
    },
    {
        key: "staff",
        label: "Staff",
        category: "Core Operations",
        description: "Teaching, non-teaching, and staff directory management.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/teaching-staff",
            "/dashboard/schools/manage-teaching-staff",
            "/dashboard/schools/manage-non-teaching-staff",
        ],
        apiPatterns: [
            "/api/schools/teaching-staff",
            "/api/schools/non-teaching-staff",
            "/api/schools/:schoolId/staff",
            "/api/schools/:schoolId/teachers",
            "/api/schools/:schoolId/principal",
            "/api/schools/:schoolId/profiles/role",
        ],
    },
    {
        key: "academic_years",
        label: "Academic Years",
        category: "Core Operations",
        description: "Session management, activation, and year rollovers.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/academic-years",
        ],
        apiPatterns: [
            "/api/schools/academic-years",
            "/api/schools/:schoolId/academic-years",
        ],
    },
    {
        key: "classes_sections",
        label: "Classes & Sections",
        category: "Core Operations",
        description: "Classroom structure, sections, and roll organization.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["academic_years"],
        dashboardPatterns: [
            "/dashboard/schools/create-classes",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/classes",
            "/api/schools/:schoolId/sections",
            "/api/schools/:schoolId/academic/promotion",
        ],
    },
    {
        key: "students",
        label: "Students",
        category: "Core Operations",
        description: "Student records, admission lifecycle, and student search.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["classes_sections", "academic_years"],
        dashboardPatterns: [
            "/dashboard/schools/manage-student",
        ],
        apiPatterns: [
            "/api/schools/students",
            "/api/schools/:schoolId/students",
            "/api/schools/:schoolId/verify-student",
            "/api/schools/:schoolId/verify-student-details",
            "/api/schools/:schoolId/lookup-phone",
        ],
    },
    {
        key: "parents",
        label: "Parents",
        category: "Core Operations",
        description: "Parent directory, parent links, and contact flows.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students"],
        dashboardPatterns: [
            "/dashboard/schools/manage-parent",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/parents",
            "/api/schools/:schoolId/parents/search",
        ],
    },
    {
        key: "subjects",
        label: "Subjects",
        category: "Core Operations",
        description: "Subject catalog, master subjects, and statistics.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["classes_sections", "academic_years"],
        dashboardPatterns: [
            "/dashboard/subjects",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/subjects",
            "/api/schools/academic-years/clone/subjects",
        ],
    },
    {
        key: "timetable",
        label: "Timetable",
        category: "Core Operations",
        description: "Scheduling, slots, and teacher shift planning.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["classes_sections", "subjects", "staff"],
        dashboardPatterns: [
            "/dashboard/timetable",
            "/dashboard/teachers/shifts",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/timetable",
            "/api/schools/:schoolId/teacher-shifts",
            "/api/schools/academic-years/clone/timetable",
        ],
    },
    {
        key: "attendance",
        label: "Attendance",
        category: "Core Operations",
        description: "Attendance marking, reports, leaves, and biometric setup.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "staff", "academic_years"],
        dashboardPatterns: [
            "/dashboard/attendance",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/attendance",
        ],
    },
    {
        key: "self_attendance",
        label: "Self Attendance",
        category: "Core Operations",
        description: "Teacher and staff self check-in and check-out.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["attendance", "staff"],
        dashboardPatterns: [
            "/dashboard/markattendance",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/attendance/mark",
        ],
    },
    {
        key: "homework",
        label: "Homework",
        category: "Core Operations",
        description: "Homework creation, tracking, and submissions.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "staff", "subjects"],
        dashboardPatterns: [
            "/dashboard/schools/homework",
        ],
        apiPatterns: [
            "/api/schools/homework",
            "/api/schools/:schoolId/homework",
        ],
    },
    {
        key: "fees",
        label: "Fees",
        category: "Revenue & Finance",
        description: "Fee structures, assignment, payments, reports, and wallet flows.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "academic_years"],
        dashboardPatterns: [
            "/dashboard/fees",
        ],
        apiPatterns: [
            "/api/schools/fee",
        ],
    },
    {
        key: "payroll",
        label: "Payroll",
        category: "Revenue & Finance",
        description: "Employee payroll, periods, payslips, and compliance reports.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["staff"],
        dashboardPatterns: [
            "/dashboard/payroll",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/payroll",
        ],
    },
    {
        key: "library",
        label: "Library",
        category: "Advanced Operations",
        description: "Books, issue-return, requests, fines, and catalog search.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students"],
        dashboardPatterns: [
            "/dashboard/schools/library",
        ],
        apiPatterns: [
            "/api/schools/library",
            "/api/schools/:schoolId/library",
        ],
    },
    {
        key: "sms",
        label: "SMS",
        category: "Growth & Engagement",
        description: "SMS templates, triggers, wallet, and bulk sending.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/schools/sms",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/sms",
        ],
    },
    {
        key: "transport",
        label: "Transport",
        category: "Advanced Operations",
        description: "Fleet, routes, assignments, requests, and live tracking.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students"],
        dashboardPatterns: [
            "/dashboard/schools/transport",
            "/dashboard/transport/live-tracking",
        ],
        apiPatterns: [
            "/api/schools/transport",
            "/api/schools/:schoolId/transport",
        ],
    },
    {
        key: "examinations",
        label: "Examinations",
        category: "Core Operations",
        description: "Exam planning, marks, hall tickets, and result publishing.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "subjects", "classes_sections"],
        dashboardPatterns: [
            "/dashboard/examination",
        ],
        apiPatterns: [
            "/api/schools/examination",
            "/api/schools/:schoolId/exams",
            "/api/schools/:schoolId/examination",
        ],
    },
    {
        key: "documents",
        label: "Documents & Certificates",
        category: "Core Operations",
        description: "Templates, certificates, admit cards, and document settings.",
        plans: [SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students"],
        dashboardPatterns: [
            "/dashboard/documents",
        ],
        apiPatterns: [
            "/api/documents",
        ],
    },
    {
        key: "school_explorer",
        label: "School Explorer",
        category: "Growth & Engagement",
        description: "Public school profile, inquiries, analytics, and reviews.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: [],
        dashboardPatterns: [
            "/dashboard/school-explorer",
        ],
        apiPatterns: [
            "/api/public/schools",
        ],
    },
    {
        key: "hpc",
        label: "Holistic Progress Card",
        category: "Advanced Academics",
        description: "Competencies, SEL, activities, templates, and reports.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "subjects", "examinations"],
        dashboardPatterns: [
            "/dashboard/hpc",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/hpc",
        ],
    },
    {
        key: "alumni",
        label: "Alumni",
        category: "Growth & Engagement",
        description: "Alumni directory, conversion, and alumni lifecycle.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students"],
        dashboardPatterns: [
            "/dashboard/schools/alumni",
        ],
        apiPatterns: [
            "/api/schools/:schoolId/alumni",
        ],
    },
    {
        key: "import_export",
        label: "Import & Export",
        category: "Advanced Operations",
        description: "Bulk import and export utilities for school operations.",
        plans: [SCHOOL_FEATURE_PLAN.PRO],
        dependencies: ["students", "staff", "classes_sections"],
        dashboardPatterns: [
            "/dashboard/schools/settings/import-data",
        ],
        apiPatterns: [
            "/api/schools/import",
            "/api/schools/export",
        ],
    },
];

export const SCHOOL_FEATURES = FEATURE_DEFINITIONS.map((feature) => ({
    ...feature,
    dashboardMatchers: createMatchers(feature.dashboardPatterns),
    apiMatchers: createMatchers(feature.apiPatterns),
}));

const FEATURE_MAP = new Map(SCHOOL_FEATURES.map((feature) => [feature.key, feature]));

function unique(values) {
    return [...new Set(values)];
}

export function getFeatureDefinition(featureKey) {
    return FEATURE_MAP.get(featureKey) ?? null;
}

export function getAllFeatureKeys() {
    return SCHOOL_FEATURES.map((feature) => feature.key);
}

export function normalizeFeaturePlan(plan) {
    const normalized = String(plan || "").toUpperCase();
    return PLAN_BILLING[normalized] ? normalized : SCHOOL_FEATURE_PLAN.BASE;
}

export function normalizeFeatureOverrides(rawOverrides) {
    const safeOverrides = typeof rawOverrides === "object" && rawOverrides !== null ? rawOverrides : {};
    const validKeys = new Set(getAllFeatureKeys());

    const enabled = unique((safeOverrides.enabled || []).filter((key) => validKeys.has(key)));
    const disabled = unique((safeOverrides.disabled || []).filter((key) => validKeys.has(key)));

    return {
        enabled: enabled.filter((key) => !disabled.includes(key)),
        disabled,
    };
}

export function getPlanFeatureKeys(plan) {
    const normalizedPlan = normalizeFeaturePlan(plan);
    return SCHOOL_FEATURES
        .filter((feature) => feature.plans.includes(normalizedPlan))
        .map((feature) => feature.key);
}

export function getDependentsForFeature(featureKey) {
    const dependents = [];
    const queue = [featureKey];
    const visited = new Set([featureKey]);

    while (queue.length > 0) {
        const current = queue.shift();

        for (const feature of SCHOOL_FEATURES) {
            if (!feature.dependencies.includes(current) || visited.has(feature.key)) {
                continue;
            }

            visited.add(feature.key);
            dependents.push(feature.key);
            queue.push(feature.key);
        }
    }

    return dependents;
}

export function resolveFeatureState(input = {}) {
    const { plan, overrides } = input || {};
    const normalizedPlan = normalizeFeaturePlan(plan);
    const normalizedOverrides = normalizeFeatureOverrides(overrides);

    const baseEnabled = new Set(getPlanFeatureKeys(normalizedPlan));

    normalizedOverrides.disabled.forEach((featureKey) => baseEnabled.delete(featureKey));
    normalizedOverrides.enabled.forEach((featureKey) => baseEnabled.add(featureKey));

    const dependencyDisabled = new Map();
    let changed = true;

    while (changed) {
        changed = false;

        for (const feature of SCHOOL_FEATURES) {
            if (!baseEnabled.has(feature.key)) {
                continue;
            }

            const missingDependencies = feature.dependencies.filter((dependency) => !baseEnabled.has(dependency));

            if (missingDependencies.length > 0) {
                baseEnabled.delete(feature.key);
                dependencyDisabled.set(feature.key, missingDependencies);
                changed = true;
            }
        }
    }

    const features = SCHOOL_FEATURES.map((feature) => {
        const enabled = baseEnabled.has(feature.key);
        const source = normalizedOverrides.disabled.includes(feature.key)
            ? "override_disabled"
            : normalizedOverrides.enabled.includes(feature.key)
                ? "override_enabled"
                : enabled
                    ? "plan_default"
                    : dependencyDisabled.has(feature.key)
                        ? "dependency_disabled"
                        : "plan_locked";

        return {
            ...feature,
            enabled,
            source,
            missingDependencies: dependencyDisabled.get(feature.key) || [],
        };
    });

    return {
        plan: normalizedPlan,
        pricing: PLAN_BILLING[normalizedPlan],
        overrides: normalizedOverrides,
        features,
        enabledFeatures: features.filter((feature) => feature.enabled).map((feature) => feature.key),
        disabledFeatures: features.filter((feature) => !feature.enabled).map((feature) => feature.key),
    };
}

export function getFeatureAccessForPath(pathname, stateOrConfig) {
    if (!pathname) {
        return null;
    }

    const hasUsableMatchers = Array.isArray(stateOrConfig?.features) &&
        stateOrConfig.features.every((feature) =>
            ["dashboardMatchers", "apiMatchers"].every((channel) =>
                Array.isArray(feature?.[channel]) &&
                feature[channel].every((matcher) => typeof matcher?.test === "function")
            )
        );

    const state = hasUsableMatchers
        ? stateOrConfig
        : resolveFeatureState({
            plan: stateOrConfig?.plan,
            overrides: stateOrConfig?.overrides,
        });

    const normalizedPathname = pathname.replace(/\/$/, "") || "/";
    const channel = normalizedPathname.startsWith("/api") ? "apiMatchers" : "dashboardMatchers";

    for (const feature of state.features) {
        if (feature[channel].some((matcher) => matcher.test(normalizedPathname))) {
            return feature;
        }
    }

    return null;
}

export function previewFeatureUpdate({ plan, overrides, action, featureKey, nextPlan } = {}) {
    const currentState = resolveFeatureState({ plan, overrides });
    const currentOverrides = normalizeFeatureOverrides(overrides);

    if (action === "change_plan") {
        const resolved = resolveFeatureState({
            plan: nextPlan,
            overrides: currentOverrides,
        });

        return {
            valid: true,
            nextOverrides: currentOverrides,
            nextState: resolved,
            disabledByChange: currentState.enabledFeatures.filter((key) => !resolved.enabledFeatures.includes(key)),
            enabledByChange: resolved.enabledFeatures.filter((key) => !currentState.enabledFeatures.includes(key)),
        };
    }

    const feature = getFeatureDefinition(featureKey);
    if (!feature) {
        return {
            valid: false,
            reason: "Unknown feature",
            missingDependencies: [],
            cascadedDisables: [],
            nextOverrides: currentOverrides,
            nextState: currentState,
        };
    }

    if (action === "disable") {
        const cascadedDisables = unique([featureKey, ...getDependentsForFeature(featureKey)])
            .filter((key) => currentState.enabledFeatures.includes(key));

        const nextOverrides = normalizeFeatureOverrides({
            enabled: currentOverrides.enabled.filter((key) => !cascadedDisables.includes(key)),
            disabled: unique([...currentOverrides.disabled, ...cascadedDisables]),
        });

        return {
            valid: true,
            missingDependencies: [],
            cascadedDisables,
            nextOverrides,
            nextState: resolveFeatureState({ plan, overrides: nextOverrides }),
        };
    }

    if (action === "enable") {
        const previewState = resolveFeatureState({
            plan,
            overrides: {
                enabled: unique([...currentOverrides.enabled, featureKey]),
                disabled: currentOverrides.disabled.filter((key) => key !== featureKey),
            },
        });

        const previewFeature = previewState.features.find((item) => item.key === featureKey);
        if (!previewFeature?.enabled) {
            return {
                valid: false,
                reason: "Missing required dependencies",
                missingDependencies: previewFeature?.missingDependencies || feature.dependencies,
                cascadedDisables: [],
                nextOverrides: currentOverrides,
                nextState: currentState,
            };
        }

        const nextOverrides = normalizeFeatureOverrides({
            enabled: unique([...currentOverrides.enabled, featureKey]),
            disabled: currentOverrides.disabled.filter((key) => key !== featureKey),
        });

        return {
            valid: true,
            missingDependencies: [],
            cascadedDisables: [],
            nextOverrides,
            nextState: resolveFeatureState({ plan, overrides: nextOverrides }),
        };
    }

    return {
        valid: false,
        reason: "Unsupported action",
        missingDependencies: [],
        cascadedDisables: [],
        nextOverrides: currentOverrides,
        nextState: currentState,
    };
}

export function buildBillingSummary({ plan, activeStudentCount = 0 } = {}) {
    const normalizedPlan = normalizeFeaturePlan(plan);
    const pricing = PLAN_BILLING[normalizedPlan];
    const students = Math.max(0, Number(activeStudentCount) || 0);

    return {
        plan: normalizedPlan,
        planLabel: pricing.label,
        pricePerStudent: pricing.pricePerStudent,
        activeStudentCount: students,
        yearlyAmount: students * pricing.pricePerStudent,
        formulaLabel: `₹${pricing.pricePerStudent} × ${students} active student${students === 1 ? "" : "s"}`,
    };
}

export function getFeatureCatalogForAdmin() {
    return SCHOOL_FEATURES.map((feature) => ({
        key: feature.key,
        label: feature.label,
        category: feature.category,
        description: feature.description,
        dependencies: feature.dependencies,
        plans: feature.plans,
    }));
}

export function filterSidebarSectionsByFeatures(sections, state) {
    if (!state?.features) {
        return sections;
    }

    return sections
        .map((section) => {
            const nextItems = (section.items || [])
                .map((item) => {
                    if (Array.isArray(item.submenu) && item.submenu.length > 0) {
                        const nextSubmenu = item.submenu.filter((subItem) => {
                            const access = getFeatureAccessForPath(subItem.url, state);
                            return !access || access.enabled;
                        });

                        if (nextSubmenu.length === 0) {
                            return null;
                        }

                        return {
                            ...item,
                            submenu: nextSubmenu,
                        };
                    }

                    const access = getFeatureAccessForPath(item.url, state);
                    return !access || access.enabled ? item : null;
                })
                .filter(Boolean);

            return {
                ...section,
                items: nextItems,
            };
        })
        .filter((section) => section.items.length > 0);
}
