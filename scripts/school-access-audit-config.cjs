const BYPASS_ROUTES = {
    'admin/schools/cleanup-worker/route.js': 'Termination cleanup worker must bypass school-state locks to finish async deletion.',
    'auth/record-attempt/route.js': 'Pre-auth telemetry endpoint records failed login attempts before school access is resolved.',
    'cron/atlas-import/worker/route.js': 'Internal cron worker runs system jobs and should not be blocked by tenant account state.',
    'cron/auto-mark-absent/route.js': 'Internal cron worker runs attendance automation and should not be blocked by tenant account state.',
    'cron/billing-school-status/route.js': 'Billing cron is the source of automated school status transitions and must bypass enforcement.',
    'cron/biometric-finalize/route.js': 'Internal cron worker finalizes biometric jobs and should not be blocked by tenant account state.',
    'cron/biometric-sync/route.js': 'Internal cron worker syncs biometric devices and should not be blocked by tenant account state.',
    'cron/carousel-cleanup/route.js': 'Internal cron cleanup route is not a tenant-facing API.',
    'cron/event-reminders/route.js': 'Internal cron worker sends reminders and should not be blocked by tenant account state.',
    'cron/payroll/auto-process/route.js': 'Internal cron worker processes payroll tasks and should not be blocked by tenant account state.',
    'partners/leads/route.js': 'Partner CRM route is not school-tenant scoped.',
    'revalidate/route.js': 'Framework revalidation endpoint is infrastructure, not tenant access controlled.',
    'schools/fee/reminders/schedule/route.js': 'Legacy non-standard handler export; not an active App Router HTTP route.',
    'schools/fee/reminders/send/route.js': 'Legacy non-standard handler export; not an active App Router HTTP route.',
    'schools/library/reports/route.js': 'Legacy pages/api-style default export; not an active App Router HTTP route.',
    'schools/[schoolId]/attendance/admin/class-attendance/route.js': 'Empty legacy placeholder route file; no active handlers exported.',
    'test-dates/route.js': 'Developer fixture route for local diagnostics only.',
};

module.exports = {
    BYPASS_ROUTES,
};
