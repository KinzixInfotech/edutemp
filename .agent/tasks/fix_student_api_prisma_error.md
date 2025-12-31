# Task: Fix Prisma Relation in Student Fetch API

## Objective
Fix the `PrismaClientValidationError` in `GET /api/students` caused by referencing a non-existent relation `globalFeeStructure` on the `StudentFeeStructure` model.

## Root Cause
The `StudentFeeStructure` model has a relation field named `feeStructure` (as suggested by the error message), but the API code is attempting to `include` a field named `globalFeeStructure`.

## Plan
1.  **Analyze API Code**: Read `src/app/api/students/route.js` to locate the erroneous `include` statement.
2.  **Verify Schema (Optional but recommended)**: Briefly check `prisma/schema.prisma` if needed, but the error message is reliable (`Available options... feeStructure`).
3.  **Apply Fix**: Update `src/app/api/students/route.js` to use the correct relation name: `feeStructure`.
4.  **Verify**: Ensure the query structure remains valid (accessing `status` field on `feeStructure`).

## Verification
- The error `Unknown field globalFeeStructure` should disappear.
- The API should successfully fetch students with their fee status.
