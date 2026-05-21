import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import prisma from '@/lib/prisma';
import qstash from '@/lib/qstash';
import { getBulkJob, updateBulkJob } from '@/lib/bulk-job-store';
import { generateFileKey, uploadToR2 } from '@/lib/r2';
import { FIELD_MAPPINGS, processRow } from '../../[schoolId]/import/route';
import { getAccountCredentialsEmailTemplate } from '@/lib/email';
import { sendResendEmail } from '@/lib/resend';
import { mapImportRow } from '@/lib/import-column-mapping';
import { readImportWorksheetRows } from '@/lib/import-workbook';
import { createUnresolvedEnrollmentIssuesForBatch } from '@/lib/enrollment/session-enrollment';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';
const IS_DEV = process.env.NODE_ENV === 'development';

function toEtaSeconds(processedRows, totalRows, startedAt) {
  if (!processedRows || processedRows >= totalRows) return 0;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  if (elapsedMs <= 0) return null;
  const rowsPerMs = processedRows / elapsedMs;
  if (!rowsPerMs) return null;
  return Math.max(1, Math.round((totalRows - processedRows) / rowsPerMs / 1000));
}

function buildCompletionEmail(job, summary) {
  const errorCsvLine = summary.errorReportUrl ? `<p><strong>Error CSV:</strong> <a href="${summary.errorReportUrl}">Download failed rows report</a></p>` : '';
  const uploadedFileLine = job.fileUrl ? `<p><strong>Uploaded File:</strong> <a href="${job.fileUrl}">Download original file</a></p>` : '';

  return {
    subject: `Import completed: ${job.moduleKey} (${summary.success}/${job.totalRows})`,
    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2 style="margin-bottom: 8px;">Bulk import completed</h2>
                <p><strong>Module:</strong> ${job.moduleKey}</p>
                <p><strong>Total Rows:</strong> ${job.totalRows}</p>
                <p><strong>Success:</strong> ${summary.success}</p>
                <p><strong>Failed:</strong> ${summary.failed}</p>
                <p><strong>Accounts created:</strong> ${summary.accountsCreated}</p>
                <p><strong>Accounts failed:</strong> ${summary.accountsFailed}</p>
                ${errorCsvLine}
                ${uploadedFileLine}
            </div>
        `,
    text: [
    'Bulk import completed',
    `Module: ${job.moduleKey}`,
    `Total Rows: ${job.totalRows}`,
    `Success: ${summary.success}`,
    `Failed: ${summary.failed}`,
    `Accounts created: ${summary.accountsCreated}`,
    `Accounts failed: ${summary.accountsFailed}`,
    summary.errorReportUrl ? `Error CSV: ${summary.errorReportUrl}` : null,
    job.fileUrl ? `Uploaded File: ${job.fileUrl}` : null].
    filter(Boolean).join('\n')
  };
}

// Time-guard: re-enqueue only if we're about to hit the Vercel timeout
const MAX_WORKER_DURATION_MS = 50_000; // 50 seconds safety margin

async function enqueueNext(jobId) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
  const workerUrl = `${baseUrl}/api/schools/import/worker`;

  if (IS_DEV) {
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY
      },
      body: JSON.stringify({ jobId })
    }).catch((error) => console.error('[IMPORT WORKER CHAIN ERROR]', error));
    return;
  }

  await qstash.publishJSON({
    url: workerUrl,
    body: { jobId },
    retries: 3
  });
}

async function updateHistory(job) {
  await prisma.importHistory.update({
    where: { id: job.historyId },
    data: {
      success: job.success,
      failed: job.failed,
      accountsCreated: job.accountsCreated,
      accountsFailed: job.accountsFailed,
      errors: {
        jobId: job.id,
        status: job.status,
        processedRows: job.processedRows,
        totalRows: job.totalRows,
        chunkSize: job.chunkSize,
        totalChunks: job.chunks.length,
        fileUrl: job.fileUrl,
        errorReportUrl: job.errorReportUrl || null,
        importedWithWarnings: job.importedWithWarnings || 0,
        missingJoiningDate: job.missingJoiningDate || 0,
        unresolvedEnrollmentCount: job.unresolvedEnrollmentCount || 0,
        failedRows: job.failedRows.slice(0, 200),
        credentials: job.credentials || [],
        etaSeconds: toEtaSeconds(job.processedRows, job.totalRows, job.startedAt)
      }
    }
  });
}

async function updateImportBatch(job, patch = {}) {
  if (!job.importBatchId) return null;

  return prisma.importBatch.update({
    where: { id: job.importBatchId },
    data: {
      status: job.status === 'completed' ? 'COMPLETED' :
        job.status === 'failed' ? 'FAILED' :
        job.status === 'cancelled' ? 'CANCELLED' :
        job.status === 'running' ? 'RUNNING' : 'QUEUED',
      successfulRows: job.success || 0,
      failedRows: job.failed || 0,
      warningCount: job.importedWithWarnings || 0,
      missingJoiningDateCount: job.missingJoiningDate || 0,
      metadata: {
        jobId: job.id,
        fileUrl: job.fileUrl,
        errorReportUrl: job.errorReportUrl || null,
        accountsCreated: job.accountsCreated || 0,
        accountsFailed: job.accountsFailed || 0,
      },
      ...patch,
    },
  });
}

async function parseWorkbookRows(job) {
  const response = await fetch(job.fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source file (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const fieldMap = FIELD_MAPPINGS[job.moduleKey] || {};
  return readImportWorksheetRows(workbook, fieldMap, { sheetName: job.sheetName }).rows;
}

function mapRow(row, fieldMap) {
  return mapImportRow(row, fieldMap);
}

async function handleWorker(req) {
  const workerStartTime = Date.now();
  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const job = await getBulkJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status === 'completed') {
    return NextResponse.json({ success: true, message: 'Job already completed' });
  }

  if (job.status === 'cancelled') {
    return NextResponse.json({ success: true, message: 'Job cancelled' });
  }

  const fieldMap = FIELD_MAPPINGS[job.moduleKey];
  const school = await prisma.school.findUnique({ where: { id: job.schoolId }, select: { name: true } });
  const adminUser = await prisma.user.findUnique({ where: { id: job.importedBy }, select: { email: true, name: true } });

  const failedRows = [...job.failedRows];
  let success = job.success;
  let failed = job.failed;
  let accountsCreated = job.accountsCreated;
  let accountsFailed = job.accountsFailed;
  let importedWithWarnings = job.importedWithWarnings || 0;
  let missingJoiningDate = job.missingJoiningDate || 0;
  const credentials = [...(job.credentials || [])];
  let lastProcessedRows = job.processedRows || 0;
  let timedOut = false;

  // Parse workbook once for all chunks
  let rows;
  try {
    rows = await parseWorkbookRows(job);
  } catch (err) {
    console.error('[IMPORT WORKER] Failed to parse workbook', err);
    await updateBulkJob(job.id, { status: 'failed' });
    return NextResponse.json({ error: 'Failed to parse workbook' }, { status: 500 });
  }

  job.status = 'running';

  // ── Process ALL pending chunks in a single invocation ─────────
  while (true) {
    // Time-guard: if approaching Vercel timeout, break and re-enqueue
    if (Date.now() - workerStartTime > MAX_WORKER_DURATION_MS) {
      timedOut = true;
      console.log(`[IMPORT WORKER] Time-guard triggered after ${Math.round((Date.now() - workerStartTime) / 1000)}s, re-enqueuing`);
      break;
    }

    const nextChunk = job.chunks.find((chunk) => chunk.status === 'queued' || chunk.status === 'failed' && chunk.retryCount < 3);
    if (!nextChunk) break;

    try {
      nextChunk.status = 'running';

      const chunkRows = rows.slice(nextChunk.startRow, nextChunk.endRow + 1);

      for (let index = 0; index < chunkRows.length; index++) {
        // Check cancellation every 50 rows to reduce Redis calls
        if (index % 50 === 0 && index > 0) {
          const latestJob = await getBulkJob(job.id);
          if (latestJob?.status === 'cancelled') {
            nextChunk.status = 'cancelled';
            const cancelledJob = {
              ...job,
              status: 'cancelled',
              processedRows: Math.min(job.totalRows, nextChunk.startRow + index),
              success, failed, accountsCreated, accountsFailed,
              importedWithWarnings, missingJoiningDate, credentials, failedRows,
              chunks: job.chunks,
            };
            await updateBulkJob(job.id, cancelledJob);
            await updateHistory(cancelledJob);
            return NextResponse.json({ success: true, message: 'Job cancelled' });
          }
        }

        const row = chunkRows[index];
        const rowNumber = row['S.No'] || nextChunk.startRow + index + 2;

        try {
          const result = await processRow(job.moduleKey, row, job.schoolId, fieldMap, {
            academicYearId: job.academicYearId || null,
            classMappings: job.classMappings || {},
            sectionMappings: job.sectionMappings || {},
            importBatchId: job.importBatchId || null,
            rowNumber,
          });
          success += 1;
          if (result?.warnings?.length) importedWithWarnings += 1;
          if (result?.missingJoiningDate) missingJoiningDate += 1;

          if (result?.authSuccess) {
            accountsCreated += 1;
            credentials.push({
              name: result.name,
              userType: job.moduleKey === 'students' ? 'student' : job.moduleKey === 'teachers' ? 'teacher' : job.moduleKey === 'parents' ? 'parent' : 'staff',
              loginLabel: result.loginLabel || 'Login',
              loginValue: result.loginValue || null,
              internalEmail: result.email || null,
              visibleEmail: result.deliveryEmail || null,
              password: result.defaultPassword || null,
              className: result.className || null,
              sectionName: result.sectionName || null,
              missingJoiningDate: Boolean(result.missingJoiningDate),
            });

            if (job.sendEmails && result.deliveryEmail) {
              const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com'}/login`;
              const emailTemplate = getAccountCredentialsEmailTemplate({
                userName: result.name,
                email: result.deliveryEmail,
                password: result.defaultPassword,
                userType: job.moduleKey === 'students' ? 'student' : job.moduleKey === 'teachers' ? 'teacher' : job.moduleKey === 'parents' ? 'parent' : 'staff',
                schoolName: school?.name || 'Your School',
                loginUrl,
                loginLabel: result.loginLabel,
                loginValue: result.loginValue,
              });

              try {
                await sendResendEmail({
                  to: result.deliveryEmail,
                  subject: emailTemplate.subject,
                  html: emailTemplate.html,
                  text: emailTemplate.text
                });
              } catch (emailError) {
                importedWithWarnings += 1;
                failedRows.push({
                  row: rowNumber,
                  reason: `Credentials email was not sent: ${emailError.message || 'email provider error'}`,
                  data: mapRow(row, fieldMap)
                });
              }
            }
          } else if (result?.authError) {
            accountsFailed += 1;
            failedRows.push({ row: rowNumber, reason: result.authError, data: mapRow(row, fieldMap) });
          }
        } catch (error) {
          failed += 1;
          failedRows.push({
            row: rowNumber,
            reason: error.message,
            data: mapRow(row, fieldMap)
          });
        }
      }

      nextChunk.status = 'completed';
      lastProcessedRows = Math.min(job.totalRows, nextChunk.endRow + 1);
    } catch (error) {
      nextChunk.retryCount = (nextChunk.retryCount || 0) + 1;
      nextChunk.status = 'failed';
      nextChunk.lastError = error.message;
      console.error(`[IMPORT WORKER] Chunk ${nextChunk.index} error:`, error.message);

      if (nextChunk.retryCount >= 3) {
        // Skip this chunk permanently, move to next
        continue;
      }
    }
  }

  // ── Finalize job state ────────────────────────────────────────
  const allChunksDone = job.chunks.every((chunk) => chunk.status === 'completed' || (chunk.status === 'failed' && chunk.retryCount >= 3));

  const updatedJob = {
    ...job,
    status: allChunksDone ? 'completed' : 'running',
    processedRows: lastProcessedRows,
    success,
    failed,
    accountsCreated,
    accountsFailed,
    importedWithWarnings,
    missingJoiningDate,
    credentials,
    failedRows,
    chunks: job.chunks
  };

  if (allChunksDone) {
    if (failedRows.length) {
      const csvLines = [
        'Row,Reason,Data',
        ...failedRows.map((entry) => {
          const serialized = JSON.stringify(entry.data || {}).replaceAll('"', '""');
          const reason = String(entry.reason || '').replaceAll('"', '""');
          return `${entry.row},"${reason}","${serialized}"`;
        })
      ];
      const key = generateFileKey(`import-errors-${job.moduleKey}.csv`, { folder: 'documents', subFolder: 'import-errors', schoolId: job.schoolId });
      updatedJob.errorReportUrl = await uploadToR2(key, Buffer.from(csvLines.join('\n')), 'text/csv');
    }

    if (adminUser?.email) {
      try {
        const email = buildCompletionEmail(updatedJob, updatedJob);
        await sendResendEmail({
          to: adminUser.email,
          subject: email.subject,
          html: email.html,
          text: email.text
        });
      } catch (emailError) {
        console.error('[IMPORT COMPLETION EMAIL ERROR]', emailError);
      }
    }

    if (job.importBatchId && job.moduleKey === 'students') {
      const resolution = await createUnresolvedEnrollmentIssuesForBatch({
        schoolId: job.schoolId,
        importBatchId: job.importBatchId,
        importedAcademicYearId: job.academicYearId,
      });
      updatedJob.unresolvedEnrollmentCount = resolution.created || 0;
    }
  }

  await updateBulkJob(job.id, updatedJob);
  await updateHistory(updatedJob);
  await updateImportBatch(updatedJob, {
    unresolvedEnrollmentCount: updatedJob.unresolvedEnrollmentCount || 0,
  });

  // Only re-enqueue if timed out with remaining chunks
  if (!allChunksDone && timedOut) {
    await enqueueNext(job.id);
  }

  return NextResponse.json({
    success: true,
    jobId: job.id,
    status: updatedJob.status,
    processedRows: updatedJob.processedRows,
    totalRows: updatedJob.totalRows,
    etaSeconds: toEtaSeconds(updatedJob.processedRows, updatedJob.totalRows, updatedJob.startedAt)
  });
}export const POST = withSchoolAccess(async function POST(req) {
  if (IS_DEV) {
    if (req.headers.get('x-internal-key') !== INTERNAL_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handleWorker(req);
  }

  return verifySignatureAppRouter(handleWorker)(req);
});
