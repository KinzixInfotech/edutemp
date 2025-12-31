# Task: Remove 'Status' Field from Student Fetch API

## Objective
Fix the `PrismaClientValidationError` in `GET /api/students` caused by selecting `status` on `FeeStructure`.

## Root Cause
The `FeeStructure` model does NOT have a `status` field, as indicated by the error message's available options list.

## Plan
1.  **Analyze API Code**: Locate the `select: { status: true }` block in `src/app/api/students/route.js`.
2.  **Remove Invalid Field**: Remove the `status` selection.
3.  **Determine Alternative**: If `status` was intended to track payment status (Paid/Pending), it might be derived from `FeePayments` or computed dynamically. For now, since `FeeStructure` definition seems to be about the *template*, and `StudentFeeStructure` tracks the assignment, maybe the *assignment* has the status?
    *   BUT `StudentFeeStructure` is the parent in this query context (`StudentFeeStructure: { include: { feeStructure: ... } }`).
    *   Actually, `StudentFeeStructure` model usually tracks `status` (e.g., Assigned, Paid).
    *   The error is on `feeStructure` (the template).
    *   If the goal is to show "Active/Archived" fee structure, I should check if `FeeStructure` has `isActive` or similar? The list shows: `id, schoolId, academicYearId, issueDate, name, createdAt...` NO status-like field.
    *   So I will simply remove `select: { status: true }`.

## Verification
- API returns students without error.
