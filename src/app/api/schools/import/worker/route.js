import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import prisma from '@/lib/prisma';
import qstash from '@/lib/qstash';
import { getBulkJob, updateBulkJob } from '@/lib/bulk-job-store';
import { generateFileKey, uploadToR2 } from '@/lib/r2';
import { FIELD_MAPPINGS, processRow } from '../../[schoolId]/import/route';
import { getAccountCredentialsEmailTemplate, sendEmail } from '@/lib/email';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';
const IS_DEV = process.env.NODE_ENV === 'development';

function normalizeColumnName(col) {
    return String(col || '')
        .replace(/\s*\*\s*/g, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .trim()
        .toLowerCase();
}

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
            job.fileUrl ? `Uploaded File: ${job.fileUrl}` : null,
        ].filter(Boolean).join('\n'),
    };
}

async function enqueueNext(jobId) {
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
    const workerUrl = `${baseUrl}/api/schools/import/worker`;

    if (IS_DEV) {
        fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-key': INTERNAL_KEY,
            },
            body: JSON.stringify({ jobId }),
        }).catch((error) => console.error('[IMPORT WORKER CHAIN ERROR]', error));
        return;
    }

    await qstash.publishJSON({
        url: workerUrl,
        body: { jobId },
        retries: 3,
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
                failedRows: job.failedRows.slice(0, 200),
                etaSeconds: toEtaSeconds(job.processedRows, job.totalRows, job.startedAt),
            },
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
    const sheetName = workbook.SheetNames.find((sheet) => sheet === 'Data') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    return rawData.filter((row) => {
        const meaningfulValues = Object.entries(row)
            .filter(([key]) => key !== 'S.No')
            .map(([, value]) => String(value ?? '').trim())
            .filter(Boolean);
        return meaningfulValues.length > 0;
    });
}

function mapRow(row, fieldMap) {
    const rowKeys = Object.keys(row);
    const mappedData = {};

    for (const [excelCol, dbField] of Object.entries(fieldMap)) {
        const normalizedExpected = normalizeColumnName(excelCol);
        const matchingKey = rowKeys.find((key) => normalizeColumnName(key) === normalizedExpected);

        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== '') {
            let value = row[matchingKey];
            if (typeof value === 'number') value = String(value);
            mappedData[dbField] = value;
        }
    }

    return mappedData;
}

async function handleWorker(req) {
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

    const nextChunk = job.chunks.find((chunk) => chunk.status === 'queued' || (chunk.status === 'failed' && chunk.retryCount < 3));
    if (!nextChunk) {
        return NextResponse.json({ success: true, message: 'No pending chunks' });
    }

    const fieldMap = FIELD_MAPPINGS[job.moduleKey];
    const school = await prisma.school.findUnique({ where: { id: job.schoolId }, select: { name: true } });
    const adminUser = await prisma.user.findUnique({ where: { id: job.importedBy }, select: { email: true, name: true } });

    try {
        job.status = 'running';
        nextChunk.status = 'running';
        await updateBulkJob(job.id, { status: job.status, chunks: job.chunks });

        const rows = await parseWorkbookRows(job);
        const chunkRows = rows.slice(nextChunk.startRow, nextChunk.endRow + 1);
        const failedRows = [...job.failedRows];
        let success = job.success;
        let failed = job.failed;
        let accountsCreated = job.accountsCreated;
        let accountsFailed = job.accountsFailed;

        for (let index = 0; index < chunkRows.length; index++) {
            const row = chunkRows[index];
            const rowNumber = row['S.No'] || (nextChunk.startRow + index + 2);

            try {
                const result = await processRow(job.moduleKey, row, job.schoolId, fieldMap);
                success += 1;

                if (result?.authSuccess) {
                    accountsCreated += 1;

                    if (job.sendEmails && result.email) {
                        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com'}/login`;
                        const emailTemplate = getAccountCredentialsEmailTemplate({
                            userName: result.name,
                            email: result.email,
                            password: result.defaultPassword,
                            userType: job.moduleKey === 'students' ? 'student' : job.moduleKey === 'teachers' ? 'teacher' : job.moduleKey === 'parents' ? 'parent' : 'staff',
                            schoolName: school?.name || 'Your School',
                            loginUrl,
                        });

                        await sendEmail({
                            to: result.email,
                            subject: emailTemplate.subject,
                            html: emailTemplate.html,
                            text: emailTemplate.text,
                        });
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
                    data: mapRow(row, fieldMap),
                });
            }
        }

        nextChunk.status = 'completed';
        const processedRows = Math.min(job.totalRows, nextChunk.endRow + 1);
        const allChunksDone = job.chunks.every((chunk) => chunk.status === 'completed' || chunk.index === nextChunk.index);

        const updatedJob = {
            ...job,
            status: allChunksDone ? 'completed' : 'running',
            processedRows,
            success,
            failed,
            accountsCreated,
            accountsFailed,
            failedRows,
            chunks: job.chunks,
        };

        if (allChunksDone) {
            if (failedRows.length) {
                const csvLines = [
                    'Row,Reason,Data',
                    ...failedRows.map((entry) => {
                        const serialized = JSON.stringify(entry.data || {}).replaceAll('"', '""');
                        const reason = String(entry.reason || '').replaceAll('"', '""');
                        return `${entry.row},"${reason}","${serialized}"`;
                    }),
                ];

                const key = generateFileKey(`import-errors-${job.moduleKey}.csv`, { folder: 'documents', subFolder: 'import-errors', schoolId: job.schoolId });
                updatedJob.errorReportUrl = await uploadToR2(key, Buffer.from(csvLines.join('\n')), 'text/csv');
            }

            if (adminUser?.email) {
                const email = buildCompletionEmail(updatedJob, updatedJob);
                await sendEmail({
                    to: adminUser.email,
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                });
            }
        }

        await updateBulkJob(job.id, updatedJob);
        await updateHistory(updatedJob);

        if (!allChunksDone) {
            await enqueueNext(job.id);
        }

        return NextResponse.json({
            success: true,
            jobId: job.id,
            status: updatedJob.status,
            processedRows: updatedJob.processedRows,
            totalRows: updatedJob.totalRows,
            etaSeconds: toEtaSeconds(updatedJob.processedRows, updatedJob.totalRows, updatedJob.startedAt),
        });
    } catch (error) {
        nextChunk.retryCount += 1;
        nextChunk.status = 'failed';
        nextChunk.lastError = error.message;

        const updatedJob = {
            ...job,
            status: nextChunk.retryCount >= 3 ? 'failed' : 'running',
            chunks: job.chunks,
        };

        await updateBulkJob(job.id, updatedJob);
        await updateHistory(updatedJob);

        if (nextChunk.retryCount < 3) {
            await enqueueNext(job.id);
        }

        console.error('[IMPORT WORKER ERROR]', error);
        return NextResponse.json({ error: error.message || 'Worker failed' }, { status: 500 });
    }
}

export async function POST(req) {
    if (IS_DEV) {
        if (req.headers.get('x-internal-key') !== INTERNAL_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return handleWorker(req);
    }

    return verifySignatureAppRouter(handleWorker)(req);
}
