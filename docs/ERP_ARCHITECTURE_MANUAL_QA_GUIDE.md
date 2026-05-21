# ERP Architecture Manual QA Guide

Last updated: 2026-05-21

This guide is for manual validation only. It intentionally does not assume automated tests have passed. Use it to verify the web ERP, mobile app, backend APIs, imports, enrollment lifecycle, and module feature controls.

## Backend Enforcement Audit

### Current Verdict

Feature control is not UI-only anymore for routes that pass through `withSchoolAccess` and match a configured feature path. Those routes are checked server-side through `getSchoolFeatureAccessSnapshot()` and return `403` with code `SCHOOL_FEATURE_DISABLED` when the module is disabled.

However, enforcement is not yet complete for every backend path:

- Most operational REST APIs use `withSchoolAccess`.
- Some REST APIs do not use `withSchoolAccess`; many are public/auth/super-admin/cron endpoints, but several mobile and legacy endpoints still need explicit review.
- Chat REST routes use `withSchoolAccess`, but the feature matcher catalog currently does not include `/api/schools/:schoolId/chat`, so chat may not be rejected server-side unless the matcher is expanded.
- Notice REST routes use `withSchoolAccess`, but the catalog currently includes `/api/schools/notice` while real notice routes are `/api/notices/:schoolId`, so notices may not be rejected server-side unless the matcher is expanded.
- Cron routes under `/api/cron/*` do not use `withSchoolAccess`; they need job-level feature checks before processing per school.
- `/api/workers/notification` does not use `withSchoolAccess`; notification worker feature checks need explicit validation.
- Socket/websocket enforcement was not proven in this audit. If socket handlers exist outside Next API routes, they must call the same centralized school feature helper.
- Push notification helpers and cron notification checkers do not appear to centrally validate module access before generating all notifications.

### Backend-Safe Today

These are safe only when both are true: the route uses `withSchoolAccess`, and its URL matches `src/lib/school-feature-config.js`.

Examples:

- Fees: `/api/schools/fee/*`
- Transport: `/api/schools/transport/*`
- Attendance: `/api/schools/:schoolId/attendance/*`
- Timetable: `/api/schools/:schoolId/timetable/*`
- Examinations: `/api/schools/:schoolId/examination/*`
- Documents: `/api/documents/*`
- Import/export workers started through matched import/export routes

### Backend Risk Areas

Manually verify these before treating feature controls as security-complete:

- Chat: `/api/schools/:schoolId/chat/*`
- Notices: `/api/notices/:schoolId/*`
- Notifications: `/api/notifications/*`, `/api/workers/notification`
- Cron: `/api/cron/notifications`, `/api/cron/event-reminders`, `/api/cron/auto-mark-absent`, `/api/cron/biometric-sync`, `/api/cron/payroll/auto-process`
- Mobile dashboard endpoints: `/api/mobile/dashboard/*`
- Legacy direct endpoints without `withSchoolAccess`, especially `/api/timetable/create`, `/api/schools/fee/reminders/schedule`, `/api/schools/library/reports`

## Suggested Testing Order

1. Create test school, sessions, classes, sections, users, and feature settings.
2. Verify feature gating at web UI, mobile UI, direct URL, and direct API level.
3. Verify current-session student counts before importing historical data.
4. Test historical import, current import, warnings, missing joining date, and unresolved issue generation.
5. Test enrollment resolution center bulk actions.
6. Test promotion engine and historical preservation.
7. Test fees, attendance, transport, exams, documents against active enrollments only.
8. Test rollback after clean import.
9. Test rollback when dependencies exist.
10. Test mobile stale app behavior by logging in before disabling a feature, then disabling it from web.

## Recommended Test Data Setup

- Schools:
  - `QA Pro School`: all modules enabled.
  - `QA Limited School`: disable fees, transport, chat/communication, library, import/export one at a time.
- Sessions:
  - `2021-22` historical.
  - `2025-26` previous.
  - `2026-27` active current.
- Classes:
  - Nursery, LKG, UKG, Class 1, Class 2, Class 5, Class 6, Class 7.
- Sections:
  - A, B.
- Accounts:
  - Super admin.
  - School admin/director.
  - Principal.
  - Teacher.
  - Accountant.
  - Parent.
  - Student.
  - Transport staff/driver.
- Import files:
  - Current-session valid student file.
  - Historical-session file.
  - File with missing joining dates.
  - File with unknown class names like `STD-II`, `class 1`, `VII`.
  - File with multiple sheets.
  - Duplicate import file.

## Recovery / Reset Between Tests

- Use Import History rollback for imported data.
- If rollback is blocked, remove dependent fee/transport/attendance records first and retry rollback.
- Keep a known clean school for feature-gating tests.
- Use separate sessions for historical import tests so current-session counts are easy to compare.
- Do not delete TC/alumni/dropout students when testing lifecycle; verify historical records remain.

---

## A. Historical Imports

### Feature Name

Historical and current-session bulk student imports.

### Purpose

Allow real-world historical data import without automatically making old students active in the current session.

### Required Setup

Active session `2026-27`, historical session `2021-22`, classes and sections created, admin user logged in, import/export module enabled.

### Exact Testing Steps

1. Open `/dashboard/schools/settings/import-data`.
2. Select `2021-22`.
3. Upload a valid historical student Excel file.
4. Confirm import after class/section mapping.
5. Open Current Session Students.
6. Open Enrollment Resolution Center.
7. Repeat with `2026-27` current session.
8. Repeat with same file again to check duplicates.
9. Repeat with missing joining dates.
10. Repeat with multiple sheets and select only one intended sheet.

### Expected Result

- Historical import creates global students and `2021-22` enrollments only.
- Current-session import creates current active enrollments.
- Historical students missing current enrollment appear as unresolved.
- Missing joining date students import with warnings and fee-blocking status.
- Duplicate import updates/skips safely; no duplicate current enrollments.
- Import report shows total rows, successful rows, warnings, failed rows, unresolved count.

### What Should NOT Happen

- Historical students must not appear as active current-session students.
- Missing joining date must not reject the whole student profile.
- Unknown classes must not silently map to wrong classes.
- Empty trailing Excel rows must not inflate record count.

### Edge Cases To Try

- `STD-I`, `STD-II`, `class 1`, `L.K.G`, `U.K.G`, lowercase `play`.
- Missing class, missing section, missing DOB, missing joining date.
- Excel date serial values and `DD/MM/YYYY`.
- Multiple sheets where one sheet contains unrelated data.

### APIs Involved

- `POST /api/schools/[schoolId]/import/preview`
- `POST /api/schools/[schoolId]/import`
- `POST /api/schools/[schoolId]/import/jobs`
- `POST /api/schools/import/worker`
- `GET /api/schools/[schoolId]/import/history`
- `GET /api/schools/[schoolId]/enrollment-resolution`

### Pages/Screens Involved

- `/dashboard/schools/settings/import-data`
- `/dashboard/schools/students/enrollment-resolution`
- `/dashboard/schools/manage-student`

---

## B. Enrollment Resolution Center

### Feature Name

Enrollment Resolution Center.

### Purpose

Resolve students who exist historically but are not enrolled in the active session.

### Required Setup

Import students into `2021-22` while `2026-27` is active.

### Exact Testing Steps

1. Open `/dashboard/schools/students/enrollment-resolution`.
2. Verify top cards: total historical, unresolved, already active, possible alumni.
3. Filter tabs: likely active, needs verification, huge session gap, resolved.
4. Select students from `2025-26 -> 2026-27` and bulk promote.
5. Select students from `2021-22 -> 2026-27` and attempt bulk promote.
6. Mark some students alumni, TC, dropped, ignored.
7. Refresh dashboard and warning banners.

### Expected Result

- One-year gap suggests safe promotion/high confidence.
- Huge gap requires manual review; no auto-promotion.
- Bulk actions create/update enrollments transactionally.
- Resolved students disappear from unresolved open count.

### What Should NOT Happen

- No huge-gap auto-promotion.
- No duplicate active enrollment for the same student/session.
- Ignored students should not block active-session counts.

### Edge Cases To Try

- Student already active in current session.
- Student lifecycle `TC`, `ALUMNI`, `DROPPED`, `LEFT`.
- Missing class/section in last enrollment.
- Bulk action with 500+ students.

### APIs Involved

- `GET /api/schools/[schoolId]/enrollment-resolution`
- `POST /api/schools/[schoolId]/enrollment-resolution/actions`
- `POST /api/schools/[schoolId]/academic/promotion/execute`

### Pages/Screens Involved

- `/dashboard/schools/students/enrollment-resolution`
- Global unresolved banner on dashboard/manage/import/academic-years.

---

## C. Promotion Engine

### Feature Name

Enrollment-first promotion.

### Purpose

Promote students by creating new session enrollment records while preserving historical class/session data.

### Required Setup

Students enrolled in `2025-26`, active target session `2026-27`, class mappings ready.

### Exact Testing Steps

1. Open `/dashboard/schools/academic/promotion`.
2. Select from session `2025-26`, to session `2026-27`.
3. Map `5A -> 6A`.
4. Select students and preview.
5. Confirm promotion.
6. Repeat with skipped class `5A -> 7A`.
7. Attempt same promotion again.
8. Open student timeline.

### Expected Result

- New `StudentSession` is created for target year.
- Previous enrollment remains unchanged.
- Promotion history records source, destination, actor, time, type.
- Duplicate promotion is skipped/blocked.

### What Should NOT Happen

- Old enrollment must not be overwritten.
- Student should not get two enrollments for same academic year.
- Skipped class should not lose source class history.

### Edge Cases To Try

- Student with missing section.
- Student marked TC/alumni/dropped.
- Promotion with carry transport/fee options disabled.
- Large class batch.

### APIs Involved

- `GET /api/schools/[schoolId]/academic/promotion/candidates`
- `POST /api/schools/[schoolId]/academic/promotion/execute`
- `GET /api/schools/[schoolId]/academic/promotion/history`

### Pages/Screens Involved

- `/dashboard/schools/academic/promotion`
- `/dashboard/schools/students/[studentId]/timeline`

---

## D. Student Lifecycle

### Feature Name

Global registry and lifecycle statuses.

### Purpose

Separate permanent student identity from current-session operation.

### Required Setup

Students in ACTIVE, ALUMNI, TC, LEFT, DROPPED, ARCHIVED states.

### Exact Testing Steps

1. Open Current Session Students.
2. Open Global Student Registry.
3. Mark a student alumni.
4. Issue TC for another student.
5. Mark another dropped/left.
6. Re-enroll one inactive student into current session.
7. Open timeline for each student.

### Expected Result

- Current Session Students shows only current active enrollments.
- Registry shows all students ever known.
- TC/alumni/drop actions preserve historical records.
- Re-enroll creates new enrollment, not a destructive update.

### What Should NOT Happen

- TC should not delete historical fee/attendance/import records.
- Alumni should not appear in active operational counts.
- Registry should not expose operational actions like fee assignment directly.

### Edge Cases To Try

- Re-enroll a TC student.
- Mark alumni with pending dues.
- Merge duplicate students with parent links.

### APIs Involved

- `GET /api/schools/[schoolId]/students`
- `GET /api/schools/[schoolId]/students/registry`
- `GET /api/schools/[schoolId]/students/[studentId]/timeline`
- `POST /api/schools/[schoolId]/students/[studentId]/tc`

### Pages/Screens Involved

- `/dashboard/schools/manage-student`
- `/dashboard/schools/students/registry`
- `/dashboard/schools/students/[studentId]/timeline`

---

## E. Dashboard / Session Counts

### Feature Name

Session-aware dashboard counts.

### Purpose

Prevent historical/global students from inflating active operational numbers.

### Required Setup

10 current students, 20 historical-only students, 5 alumni/TC/dropped students.

### Exact Testing Steps

1. Open dashboard for active `2026-27`.
2. Note total students.
3. Switch selected session/year if supported.
4. Import more historical-only students.
5. Refresh dashboard.

### Expected Result

- Active count remains current-session enrollment count.
- Historical/global count appears only in registry/resolution context.
- Unresolved banner count updates separately.

### What Should NOT Happen

- Historical import must not increase current active student count.
- TC/alumni/drop students must not remain in active count.

### Edge Cases To Try

- Student has global record but no enrollment.
- Student has two historical enrollments and no current enrollment.

### APIs Involved

- `GET /api/dashboard/consolidated`
- `GET /api/dashboard/daily-stats`
- `GET /api/schools/reports`

### Pages/Screens Involved

- `/dashboard`
- `/dashboard/schools/manage-student`

---

## F. Fees

### Feature Name

Enrollment-safe fee assignment and generation.

### Purpose

Fees must only operate on valid current/session enrollments and must block missing joining date.

### Required Setup

Current enrolled student with joining date, current enrolled student without joining date, historical-only student, fee structure.

### Exact Testing Steps

1. Open `/dashboard/fees/assign`.
2. Select valid current student and assign fee.
3. Select missing joining date student.
4. Select historical-only student by direct API if UI hides it.
5. Generate due/invoice/payment report.
6. Disable Fees feature from admin and retry direct API.

### Expected Result

- Valid current student can receive fee.
- Missing joining date blocks assignment/generation with clear error.
- Historical-only student is not eligible.
- Disabled Fees feature returns `403` for matched `/api/schools/fee/*` routes.

### What Should NOT Happen

- No ledger/invoice for missing joining date.
- No fee assignment to historical-only/global-only student.
- No stale app/API bypass if fees disabled.

### Edge Cases To Try

- Bulk assign where some students are invalid.
- Student changed from current to TC after assignment preview.
- Fee reminders for disabled fees module.

### APIs Involved

- `POST /api/schools/fee/assign`
- `POST /api/schools/fee/assign/worker`
- `GET /api/schools/fee/students/list`
- `GET /api/schools/fee/reports`
- `POST /api/schools/fee/reminders/send`

### Pages/Screens Involved

- `/dashboard/fees/assign`
- Fee reports/payment/reminders pages.
- Mobile fee/payment screens.

---

## G. Attendance

### Feature Name

Enrollment-first attendance.

### Purpose

Attendance should be recorded only for active session enrollment candidates.

### Required Setup

Current enrolled student, historical-only student, TC/dropped student, teacher account.

### Exact Testing Steps

1. Open attendance marking page.
2. Mark attendance for active class.
3. Try to mark historical-only student through direct API payload.
4. Try dropped/TC student.
5. Disable Attendance feature and retry direct API.

### Expected Result

- Only current enrolled students are listed/marked.
- Non-current students are skipped/rejected.
- Disabled Attendance feature returns `403` for matched attendance routes.

### What Should NOT Happen

- Historical-only students must not receive attendance records.
- TC/dropped students must not appear in daily class attendance.

### Edge Cases To Try

- Bulk mark with mixed valid/invalid students.
- Auto-mark absent cron after feature disabled.
- Biometric ingest for non-enrolled student.

### APIs Involved

- `POST /api/schools/[schoolId]/attendance/mark`
- `POST /api/schools/[schoolId]/attendance/bulk`
- `GET /api/schools/[schoolId]/attendance/admin/reports`
- `POST /api/attendance/bulk-mark`
- `GET /api/attendance/summary`

### Pages/Screens Involved

- `/dashboard/attendance`
- `/dashboard/markattendance`
- Mobile self-attendance and teacher attendance screens.

---

## H. Transport

### Feature Name

Transport enrollment and fee safety.

### Purpose

Transport assignment and transport fee generation must require valid current enrollment and joining date where fee logic depends on it.

### Required Setup

Transport routes/stops/vehicle, current enrolled student, missing joining date student, historical-only student.

### Exact Testing Steps

1. Assign route/stop to active student.
2. Assign transport fee.
3. Attempt assignment for missing joining date student.
4. Attempt assignment for historical-only student via API.
5. Disable Transport feature and retry direct API.

### Expected Result

- Active student can be assigned.
- Missing joining date blocks transport fee calculation.
- Historical-only student is rejected/skipped.
- Disabled Transport module returns `403` for matched transport routes.

### What Should NOT Happen

- No transport fee for missing joining date.
- No route assignment for historical-only students.
- No background trip/notification creation for disabled transport module.

### Edge Cases To Try

- Student dropped after route assignment.
- Generate trips while transport disabled.
- Driver app route access after transport disabled.

### APIs Involved

- `POST /api/schools/transport/student-routes`
- `POST /api/schools/transport/fees/assign`
- `POST /api/schools/transport/route-assignments/generate-trips`
- `POST /api/schools/transport/notify-approaching`

### Pages/Screens Involved

- `/dashboard/schools/transport`
- `/dashboard/transport/live-tracking`
- Mobile driver/conductor screens.

---

## I. Exams / Documents

### Feature Name

Exam and document generation against active enrollments.

### Purpose

Hall tickets, marks, admit cards, ID cards, and seat allocation must use active enrollment data.

### Required Setup

Exam, schedule, class sections, active students, historical-only student.

### Exact Testing Steps

1. Create exam for active session.
2. Allocate seats.
3. Generate hall tickets.
4. Enter marks.
5. Generate admit cards/ID cards.
6. Try historical-only student through direct API.
7. Disable Examinations or Documents feature and retry.

### Expected Result

- Active enrolled students are included.
- Historical-only students are excluded/rejected.
- Disabled exams/documents return `403` for matched routes.

### What Should NOT Happen

- No hall ticket or marks for non-current enrollment.
- No stale global Student class cache should drive exam eligibility.

### Edge Cases To Try

- Student promoted after exam creation.
- Student with missing section.
- TC student with historical exam records.

### APIs Involved

- `GET/POST /api/schools/[schoolId]/examination/*`
- `GET/POST /api/schools/[schoolId]/examination/[examId]/hall-tickets`
- `GET/POST /api/schools/[schoolId]/examination/exams/[examId]/seat-allocation`
- `GET /api/documents/[schoolId]/idcards/bulk-data`
- `GET /api/documents/[schoolId]/admitcards/bulk-data`

### Pages/Screens Involved

- `/dashboard/examination`
- `/dashboard/documents`
- Mobile exams/performance screens.

---

## J. Import Rollback System

### Feature Name

Import batch undo / rollback.

### Purpose

Safely reverse imported records while protecting dependent financial and operational records.

### Required Setup

At least one clean import batch and one import batch with dependent fees/attendance/transport records.

### Exact Testing Steps

1. Import 5 students into current session.
2. Open Import History.
3. View import details.
4. Roll back the clean batch.
5. Re-import another batch.
6. Create fee/transport/attendance dependencies.
7. Attempt rollback.

### Expected Result

- Clean rollback removes created enrollments and imported-only students where safe.
- Dependency rollback reports conflicts.
- Partial rollback marks what was rolled back and what was blocked.
- Audit logs are created.

### What Should NOT Happen

- No deletion of students with unrelated existing dependencies.
- No rollback of historical records from other batches.
- No silent partial rollback without report.

### Edge Cases To Try

- Rollback after promotion.
- Rollback after fee ledger generation.
- Rollback after parent link creation.
- Rollback twice.

### APIs Involved

- `GET /api/schools/[schoolId]/import/history`
- `GET /api/schools/[schoolId]/import/batches/[batchId]`
- `POST /api/schools/[schoolId]/import/batches/[batchId]/rollback`

### Pages/Screens Involved

- `/dashboard/schools/settings/import-data`
- Import History panel/detail/rollback views.

---

## K. Feature Gating System

### Feature Name

School module feature controls.

### Purpose

Ensure disabled modules are hidden in UX and rejected server-side.

### Required Setup

Super admin, school admin, mobile user, test school, one module disabled at a time.

### Exact Testing Steps

1. Open super admin school manage page.
2. Disable Fees.
3. Log in to web school admin and check sidebar/page visibility.
4. Directly open `/dashboard/fees/assign`.
5. Call `POST /api/schools/fee/assign` manually.
6. Log into mobile app and verify fee actions are hidden.
7. Disable Communication.
8. Verify noticeboard/chat tabs/actions disappear in mobile.
9. Directly call chat and notice APIs.
10. Re-enable modules and confirm access returns.

### Expected Result

- Web sidebar and pages hide disabled modules.
- Mobile tabs/actions hide disabled modules.
- Direct navigation is blocked.
- Direct API calls return `403` for correctly matched feature routes.

### What Should NOT Happen

- Hidden UI must not be treated as the only protection.
- Stale mobile app should not be able to use disabled routes after refresh/route guard.
- A disabled module should not generate background notifications.

### Edge Cases To Try

- User logged in before feature disabled.
- Mobile app offline during disable, then online.
- Deep link directly into disabled mobile screen.
- Feature disabled while a worker job is queued.

### APIs Involved

- `GET /api/schools/[schoolId]/features`
- `PUT /api/admin/schools/[id]/features`
- All module APIs being tested.

### Pages/Screens Involved

- `/dashboard/schools/[schoolId]/manage`
- Web module pages.
- Mobile home, tabs, and direct module screens.

---

## L. Backend Enforcement Manual Verification

### Feature Name

Server-side module enforcement.

### Purpose

Prove that disabled modules cannot be used by stale apps, scripts, direct API calls, workers, sockets, or push pipelines.

### Required Setup

One test school, auth token/session cookie, one disabled module, API client like Postman/curl/browser devtools.

### Exact Testing Steps

1. Disable a module from super admin.
2. Keep an old browser/mobile session active.
3. Copy a valid request from Network tab before disabling.
4. Replay it after disabling.
5. Confirm response status and body.
6. Trigger any related background job.
7. Trigger any socket/chat action if available.
8. Trigger notification-producing action.

### Expected Result

- Matched REST APIs return `403`.
- Error body includes `SCHOOL_FEATURE_DISABLED`, feature key, and feature label.
- Background jobs skip disabled schools or disabled module tasks.
- Socket event is rejected and no DB record is created.
- Push notification is not generated for disabled module activity.

### What Should NOT Happen

- No `200` success from direct API for disabled module.
- No DB write from socket/event after disable.
- No notification row or FCM send after disable.
- No cron-generated task for disabled module.

### Edge Cases To Try

- Disable Chat and test `/api/schools/[schoolId]/chat/conversations`.
- Disable Communication and test `/api/notices/[schoolId]`.
- Disable Fees and test fee assignment/reminder APIs.
- Disable Transport and test trip generation and route assignment.
- Disable Attendance and test auto-mark/biometric cron paths.

### APIs Involved

- `GET /api/schools/[schoolId]/features`
- Module-specific APIs.
- `/api/cron/*`
- `/api/workers/notification`
- Socket/websocket event endpoint if deployed.

### Pages/Screens Involved

- Web admin feature controls.
- Web Network tab.
- Mobile app screens for disabled modules.

## Direct API Check Examples

Use your real session cookie/token. Expected failure for disabled modules:

```bash
curl -i "https://www.edubreezy.com/api/schools/SCHOOL_ID/features"
curl -i -X POST "https://www.edubreezy.com/api/schools/fee/assign" \
  -H "Content-Type: application/json" \
  --data '{"schoolId":"SCHOOL_ID"}'
curl -i "https://www.edubreezy.com/api/schools/SCHOOL_ID/chat/conversations"
curl -i "https://www.edubreezy.com/api/notices/SCHOOL_ID"
```

Passing result:

- `403 Forbidden`
- JSON contains `code: "SCHOOL_FEATURE_DISABLED"`

Failing result:

- `200`, `201`, `204`, or DB write succeeds while the module is disabled.

## Newly Created Pages

- `/dashboard/schools/students/registry`
- `/dashboard/schools/students/enrollment-resolution`
- `/dashboard/schools/students/[studentId]/timeline`

## Modified Pages

- `/dashboard`
- `/dashboard/schools/manage-student`
- `/dashboard/schools/academic-years`
- `/dashboard/schools/academic/promotion`
- `/dashboard/schools/settings/import-data`
- Mobile app tabs/home/profile-loading/auth storage paths.

## New APIs

- `/api/schools/[schoolId]/features`
- `/api/schools/[schoolId]/students/registry`
- `/api/schools/[schoolId]/students/[studentId]/timeline`
- `/api/schools/[schoolId]/students/[studentId]/tc`
- `/api/schools/[schoolId]/enrollment-resolution/*`
- `/api/schools/[schoolId]/academic/promotion/history`
- `/api/schools/[schoolId]/import/batches/*`

## Modified APIs

- Auth user/OAuth responses include school feature access.
- Student import, import jobs, import worker, import history.
- Students listing.
- Dashboard consolidated and daily stats.
- Promotion candidates and execute.
- Attendance mark/report routes.
- Fee assignment, worker, reports, reminders, payment-facing student fee routes.
- Transport assignment, fees, requests, payments, student routes.
- Exams, marks, hall tickets, seat allocation.
- Timetable entries, stats, class view.
- Documents bulk admit card and ID card data.

## Background Jobs / Workers Added Or Changed

- Import job queue and import worker.
- Export job queue and export worker.
- Rollback/import batch APIs.
- Existing cron/notification workers remain a risk area for module feature enforcement and require explicit per-school feature checks.

## New DB Models / Enums

- `ImportBatch`
- `ImportBatchItem`
- `EnrollmentResolutionIssue`
- `PromotionBatch`
- `StudentLifecycleAuditLog`
- `StudentSession` extended as session enrollment layer.
- `PromotionHistory` extended with batch/rollback linkage.
- `ImportBatchStatus`
- `ImportBatchItemStatus`
- `EnrollmentResolutionStatus`
- `StudentLifecycleStatus`
- `EnrollmentStatus`

## Modules Still Partially Migrated Or Risky

- Chat backend feature matching: routes use `withSchoolAccess`, but matcher needs `/api/schools/:schoolId/chat`.
- Notices backend feature matching: routes use `withSchoolAccess`, but matcher needs `/api/notices/:schoolId`.
- Cron routes: mostly not feature-gated per school.
- Notification worker: not proven feature-gated.
- Socket/websocket handlers: not proven feature-gated.
- Mobile dashboard APIs: several do not use `withSchoolAccess`; verify whether they should expose disabled-module counts/actions.
- Legacy endpoints without `withSchoolAccess` need route-by-route classification as public/auth/admin/operational.

## Technical Debt / Compatibility Layers

- `Student.classId`, `Student.sectionId`, and `Student.academicYearId` still exist as compatibility/cache fields. Operational code should keep moving to `StudentSession`.
- Some module APIs still accept `studentId` and internally resolve enrollment; continue hardening toward explicit enrollment/session validation.
- Feature controls depend on path matchers; any new route must be added to `school-feature-config.js`.
- Workers and cron tasks need service-layer feature helpers, not request middleware only.
- Push notification helpers should receive school/module context and block disabled modules centrally.
- Rollback conflict UI should continue improving dependency details for non-technical admins.
