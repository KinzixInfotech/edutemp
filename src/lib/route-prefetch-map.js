/**
 * Route Prefetch Map
 * 
 * Defines which queries each route needs, so we can prefetch them
 * when hovering over sidebar links for instant navigation.
 * 
 * Format: 
 * '/route/path': [
 *   { queryKey: ['key'], queryFn: fetchFunction },
 *   // or just query keys if the queryFn is already registered
 * ]
 */

// Helper to create prefetch config
export const createPrefetchConfig = (queryKey, queryFn) => ({ queryKey, queryFn });

/**
 * Map of routes to their required query keys
 * These will be prefetched when hovering over the corresponding sidebar link
 */
export const ROUTE_QUERY_KEYS = {
    // Dashboard
    '/dashboard': [
        ['schoolTrend'],
        ['activeAccounts'],
        ['adminTeacherStats'],
        ['adminNonTeacherStats'],
    ],

    // Students
    '/dashboard/schools/students': [
        ['students'],
        ['classes'],
    ],
    '/dashboard/schools/students/enroll': [
        ['classes'],
        ['academic-years'],
    ],

    // Fees
    '/dashboard/fees/overview': [
        ['feeStats'],
        ['feeStructures'],
    ],
    '/dashboard/fees/payments': [
        ['payments'],
    ],
    '/dashboard/fees/manage-fee-structure': [
        ['feeStructures'],
        ['classes'],
    ],

    // Attendance
    '/dashboard/attendance/reports': [
        ['attendanceReports'],
    ],
    '/dashboard/attendance/daily-view': [
        ['dailyAttendance'],
    ],

    // Staff
    '/dashboard/schools/staff/teaching': [
        ['teachingStaff'],
    ],
    '/dashboard/schools/staff/non-teaching': [
        ['nonTeachingStaff'],
    ],

    // Payroll
    '/dashboard/payroll': [
        ['payrollEmployees'],
        ['payrollConfig'],
    ],

    // Timetable
    '/dashboard/timetable': [
        ['timetable'],
        ['classes'],
        ['subjects'],
    ],

    // Transport
    '/dashboard/transport/vehicles': [
        ['vehicles'],
    ],
    '/dashboard/transport/routes': [
        ['routes'],
    ],

    // Library
    '/dashboard/schools/library/catalog': [
        ['books'],
    ],

    // Documents
    '/dashboard/documents/templates': [
        ['documentTemplates'],
    ],

    // Settings
    '/dashboard/settings': [
        ['schoolConfig'],
        ['schoolSettings'],
    ],

    // Calendar
    '/dashboard/calendar': [
        ['calendarEvents'],
    ],
};

/**
 * Get query keys that should be prefetched for a given route
 * @param {string} pathname - The route pathname
 * @returns {Array<Array>} Array of query keys to prefetch
 */
export function getQueryKeysForRoute(pathname) {
    // Exact match first
    if (ROUTE_QUERY_KEYS[pathname]) {
        return ROUTE_QUERY_KEYS[pathname];
    }

    // Try partial match (for dynamic routes)
    for (const [route, keys] of Object.entries(ROUTE_QUERY_KEYS)) {
        if (pathname.startsWith(route)) {
            return keys;
        }
    }

    return [];
}

/**
 * Check if a route has prefetch configuration
 * @param {string} pathname - The route pathname
 * @returns {boolean}
 */
export function hasPrefetchConfig(pathname) {
    return getQueryKeysForRoute(pathname).length > 0;
}
