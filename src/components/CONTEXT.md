CONTEXT
I want a complete Admission Management feature for a Next.js app (app router) using Prisma and Uploadthing for file uploads. Code must be JavaScript (no TypeScript, no .tsx), follow the same API-style and conventions as the example below, and use the same patterns (NextResponse, zod, prisma import, supabaseAdmin if needed). Client-side should use TanStack Query only, written in pure JSX (no TSX). APIs should be fast and focused (edge/route handlers ok). Keep route shapes and coding style consistent with this sample:

--- sample pattern ---
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supbase-admin";

export async function POST(req) {
  // parse -> validate using zod -> prisma ops -> NextResponse.json(...)
}
export async function GET() {
  // prisma.findMany -> NextResponse.json(...)
}
--- end sample ---

DELIVERABLES
1. A complete Prisma schema (models + relations + indexes + examples of enum(s)) for Admissions, including models:
   - AdmissionForm (form configuration)
   - FormField (fields for the form)
   - Application (submitted application)
   - ApplicationDocument (uploaded files)
   - Stage (configurable admission stages)
   - StageHistory (application stage transitions + who moved + timestamps)
   - School
   - User (already exists, but include minimal relation to createdBy)
   - Payment (basic fields for registration/admission fees)
   - Any small join models needed

   Provide Prisma schema block ready to paste into schema.prisma (use SQLite or Postgres provider comment; DON'T use Prisma client code).

2. Next.js API route file examples (JavaScript) matching the style of the sample for these endpoints:
   - POST /api/schools/admissions/forms           -> create an admission form config (zod validation)
   - GET  /api/schools/admissions/forms           -> list forms
   - POST /api/schools/admissions/forms/:id/link  -> create a public shareable form link (short id / slug)
   - POST /api/schools/admissions/applications    -> submit an application (accepts formId + fields + files metadata). Use Uploadthing for uploads: return upload URLs or accept uploaded file metadata to persist in Prisma.
   - GET  /api/schools/admissions/applications   -> list applications (filter by stage/form/school)
   - GET  /api/schools/admissions/applications/:id -> get single application + docs + stage history
   - POST /api/schools/admissions/applications/:id/move -> move application to another stage (record StageHistory)
   - POST /api/schools/admissions/upload         -> signed upload/create file session via Uploadthing (if Uploadthing needs signed url workflow; if not, show server-side accept file metadata)
   - POST /api/schools/admissions/offers/:id/send -> send offer (generate PDF link or offer token; optionally create a Supabase user for parent as in sample)
   - GET  /api/schools/admissions/settings       -> fetch admission settings
   - PATCH /api/schools/admissions/settings      -> update settings (stages order, fees, notifications)

   For each route:
   - Use `zod` for request validation.
   - Use `prisma` for DB operations.
   - Return NextResponse.json({ success: true, ... }) on success.
   - On server errors log and return NextResponse.json({ error: err.message }, { status: 500 }).
   - If temporary external user creation is required (supabaseAdmin.auth.admin.createUser), follow the sample pattern: create user, connect to prisma, and cleanup on error.

3. A Prisma model mapping and an explanation of how uploads are stored:
   - Files uploaded via Uploadthing => store returned file id/url in ApplicationDocument model with metadata (filename, mime, size, uploadedBy, uploadedAt).
   - Show how to link files to an Application and to ApplicationForm (for optional templates).
   - Show example Uploadthing server-server API usage (or explain minimal server code to accept Uploadthing callbacks).

4. Client-side examples (pure JSX) using TanStack Query for:
   - Fetching forms list (useQuery).
   - Submitting an application: handle file selection, call Uploadthing sign endpoint or client upload endpoint, then call POST /api/schools/admissions/applications with form data and uploaded file metadata (useMutation).
   - Listing applications in admin with filters and drag/drop Kanban stub (just UI + calls to move endpoint). Use plain JSX + fetch wrappers and TanStack Query primitives. Use no external styles (just className placeholders). Keep components small and ready to slot into your app.

5. Admin UX hooks & responsibilities for each endpoint:
   - What UI action calls which endpoint and what payload is expected.
   - Which endpoints should show badges/counts and which should support server-side filtering/pagination.

6. Sample zod schemas used for API validation (the actual schema for each route).

7. Migration steps or short command notes to generate Prisma client and run migrations:

   Example:
   - `npx prisma migrate dev --name admissions_init`
   - `npx prisma generate`

TECHNICAL REQUIREMENTS / CONSTRAINTS
- Use **JavaScript** in API files and client components (no TypeScript).
- Keep API structure & response format similar to the sample provided by me.
- Client must use **TanStack Query only** for data fetching / mutation.
- Use **Uploadthing** for file uploads; show both server-side signed upload endpoint and client flow. If Uploadthing SDK has serverless helpers, show minimal server usage and a POST /api/schools/admissions/upload handler that returns whatever Uploadthing requires for the client (signed URL or upload token).
- Prisma models should be normalized and include relation constraints and cascade delete rules where appropriate.
- Include stage configuration: stages must be configurable (order + name + optional flags such as requiresTest, requiresInterview, feeRequired).
- Provide a minimal example of creating a public form link (slug) and how the client uses it to render the form.
- All APIs must check minimal auth where needed (you can show placeholder `const user = await getServerUser(req)` and comment that actual implementation depends on project). For public form submission endpoint, no auth required.

NON-FUNCTIONAL / UX NOTES
- Keep responses and JSON shape consistent. Example success response: `NextResponse.json({ success: true, application })`.
- For errors return meaningful status codes: 400 on validation, 409 on conflict, 500 on server error.
- Document briefly how to wire Uploadthing keys and environment variables.

EXAMPLES / SNIPPETS (required in output)
- Provide a full example for `POST /api/schools/admissions/applications` (JS file) with zod parsing, saving Application + ApplicationDocument records, and returning the created application.
- Provide a full example for `POST /api/schools/admissions/forms` (JS file) to create a form and its fields.
- Provide a full client component `SubmitApplication.jsx` (JSX) that:
  - fetches form config,
  - renders basic inputs based on FormField definitions,
  - uploads files via Uploadthing endpoint,
  - posts to the applications endpoint using TanStack Query mutation,
  - handles success/error states.

OUTPUT FORMAT
- Start with Prisma schema block.
- Then provide all API route JS code blocks (each file path as a heading).
- Then provide client JSX examples.
- Then provide short migration & env wiring notes.
- Keep explanations short, precise, and directly actionable.

Make sure the generated code is ready to paste and run (apart from environment-specific wiring like Uploadthing keys and database url). If something needs a small assumption, state the assumption clearly (for example: `Assume Uploadthing server SDK exposes createUploadthing(...)`), but keep assumptions minimal.

End of prompt.
