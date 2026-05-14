import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import qstash from '@/lib/qstash';
import { uploadToR2, generateFileKey } from '@/lib/r2';
import { createJobId, listBulkJobs, setBulkJob } from '@/lib/bulk-job-store';
import { FIELD_MAPPINGS } from '../route';
import { readImportWorksheetRows } from '@/lib/import-workbook';

const CHUNK_SIZE = 500;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

function parseClassMappings(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildQueuedChunks(totalRows) {
  const chunks = [];
  const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

  for (let index = 0; index < totalChunks; index++) {
    chunks.push({
      index,
      status: 'queued',
      retryCount: 0,
      startRow: index * CHUNK_SIZE,
      endRow: Math.min((index + 1) * CHUNK_SIZE - 1, totalRows - 1)
    });
  }

  return chunks;
}

async function enqueueWorker(jobId) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
  const workerUrl = `${baseUrl}/api/schools/import/worker`;

  if (process.env.NODE_ENV === 'development') {
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY
      },
      body: JSON.stringify({ jobId })
    }).catch((error) => console.error('[IMPORT JOB ENQUEUE ERROR]', error));
    return;
  }

  await qstash.publishJSON({
    url: workerUrl,
    body: { jobId },
    retries: 3
  });
}
// export const POST = withSchoolAccess(async function POST(req, { params }) {
//   try {
//     const { schoolId } = await params;
//     const formData = await req.formData();
//     const file = formData.get('file');
//     const moduleKey = formData.get('module');
//     const importedBy = formData.get('userId');
//     const sendEmails = formData.get('sendEmails') === 'true';
//     const academicYearId = String(formData.get('academicYearId') || '').trim() || null;
//     const requestedSheetName = String(formData.get('sheetName') || '').trim();
//     const classMappings = parseClassMappings(formData.get('classMappings'));
//     const sectionMappings = parseClassMappings(formData.get('sectionMappings'));

//     if (!file || !moduleKey || !importedBy) {
//       return NextResponse.json({ error: 'File, module, and user are required' }, { status: 400 });
//     }

//     const expectedFields = FIELD_MAPPINGS[moduleKey];
//     if (!expectedFields) {
//       return NextResponse.json({ error: `Module '${moduleKey}' not supported` }, { status: 400 });
//     }

//     let academicYear = null;
//     if (academicYearId) {
//       academicYear = await prisma.academicYear.findFirst({
//         where: { id: academicYearId, schoolId },
//         select: { id: true, name: true, startDate: true, endDate: true, isActive: true }
//       });
//       if (!academicYear) {
//         return NextResponse.json({ error: 'Selected academic year was not found for this school' }, { status: 400 });
//       }
//     }

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     const workbook = XLSX.read(buffer, { type: 'buffer' });
//     const { sheetName, rawData, rows: dataRows, headerAnalysis } = readImportWorksheetRows(workbook, expectedFields, {
//       sheetName: requestedSheetName,
//     });

//     if (!headerAnalysis.isValid) {
//       return NextResponse.json({
//         error: 'Template mapping not matched',
//         details: {
//           message: 'The uploaded file does not match the expected template format.',
//           ...headerAnalysis,
//           suggestion: 'Fix the missing or unrecognized headers shown above, or download the latest template for this module.'
//         }
//       }, { status: 400 });
//     }

//     if (!rawData.length) {
//       return NextResponse.json({ error: 'No data found in the file' }, { status: 400 });
//     }

//     if (!dataRows.length) {
//       return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
//     }

//     const fileKey = generateFileKey(file.name, { folder: 'uploads', subFolder: 'imports', schoolId });
//     const fileUrl = await uploadToR2(fileKey, buffer, file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

//     const jobId = createJobId(`import_${moduleKey}`);
//     const totalRows = dataRows.length;
//     const chunks = buildQueuedChunks(totalRows);

//     const history = await prisma.importHistory.create({
//       data: {
//         schoolId,
//         module: moduleKey,
//         fileName: file.name,
//         totalRows,
//         success: 0,
//         failed: 0,
//         importedBy,
//         errors: {
//           jobId,
//           status: 'queued',
//           processedRows: 0,
//           totalRows,
//           chunkSize: CHUNK_SIZE,
//           totalChunks: chunks.length,
//           fileUrl,
//           errorReportUrl: null
//         }
//       }
//     });

//     await setBulkJob(jobId, {
//       id: jobId,
//       type: 'import',
//       schoolId,
//       moduleKey,
//       sheetName,
//       fileName: file.name,
//       fileUrl,
//       importedBy,
//       sendEmails,
//       classMappings,
//       sectionMappings,
//       academicYearId,
//       academicYearName: academicYear?.name || null,
//       historyId: history.id,
//       status: 'queued',
//       chunkSize: CHUNK_SIZE,
//       totalRows,
//       processedRows: 0,
//       success: 0,
//       failed: 0,
//       accountsCreated: 0,
//       accountsFailed: 0,
//       importedWithWarnings: 0,
//       missingJoiningDate: 0,
//       credentials: [],
//       chunks,
//       failedRows: [],
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString(),
//       startedAt: new Date().toISOString()
//     });

//     await enqueueWorker(jobId);

//     return NextResponse.json({
//       success: true,
//       jobId,
//       historyId: history.id,
//       status: 'queued',
//       totalRows,
//       totalChunks: chunks.length,
//       chunkSize: CHUNK_SIZE
//     });
//   } catch (error) {
//     console.error('[IMPORT JOB CREATE ERROR]', error);
//     return NextResponse.json({ error: error.message || 'Failed to start import job' }, { status: 500 });
//   }
// });
export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;

    const formData = await req.formData();

    const file = formData.get('file');
    const moduleKey = formData.get('module');
    const importedBy = formData.get('userId');
    const sendEmails = formData.get('sendEmails') === 'true';

    const academicYearId =
      String(formData.get('academicYearId') || '').trim() || null;

    const requestedSheetName =
      String(formData.get('sheetName') || '').trim();

    const classMappings = parseClassMappings(
      formData.get('classMappings')
    );

    const sectionMappings = parseClassMappings(
      formData.get('sectionMappings')
    );

    if (!file || !moduleKey || !importedBy) {
      return NextResponse.json(
        {
          success: false,
          step: 'VALIDATION',
          error: 'File, module, and user are required'
        },
        { status: 400 }
      );
    }

    const expectedFields = FIELD_MAPPINGS[moduleKey];

    if (!expectedFields) {
      return NextResponse.json(
        {
          success: false,
          step: 'FIELD_MAPPINGS',
          error: `Module '${moduleKey}' not supported`
        },
        { status: 400 }
      );
    }

    let academicYear = null;

    if (academicYearId) {
      try {
        academicYear = await prisma.academicYear.findFirst({
          where: {
            id: academicYearId,
            schoolId
          },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true
          }
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            step: 'prisma.academicYear.findFirst',
            error:
              error.message || 'Failed to fetch academic year'
          },
          { status: 500 }
        );
      }

      if (!academicYear) {
        return NextResponse.json(
          {
            success: false,
            step: 'ACADEMIC_YEAR_VALIDATION',
            error:
              'Selected academic year was not found for this school'
          },
          { status: 400 }
        );
      }
    }

    let bytes;
    let buffer;
    let workbook;
    let worksheetData;

    try {
      bytes = await file.arrayBuffer();

      buffer = Buffer.from(bytes);

      workbook = XLSX.read(buffer, {
        type: 'buffer'
      });

      worksheetData = readImportWorksheetRows(
        workbook,
        expectedFields,
        {
          sheetName: requestedSheetName
        }
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'FILE_PROCESSING',
          error:
            error.message || 'Failed to process uploaded file'
        },
        { status: 500 }
      );
    }

    const {
      sheetName,
      rawData,
      rows: dataRows,
      headerAnalysis
    } = worksheetData;

    if (!headerAnalysis.isValid) {
      return NextResponse.json(
        {
          success: false,
          step: 'HEADER_ANALYSIS',
          error: 'Template mapping not matched',
          details: {
            message:
              'The uploaded file does not match the expected template format.',
            ...headerAnalysis,
            suggestion:
              'Fix the missing or unrecognized headers shown above, or download the latest template for this module.'
          }
        },
        { status: 400 }
      );
    }

    if (!rawData.length) {
      return NextResponse.json(
        {
          success: false,
          step: 'RAW_DATA_VALIDATION',
          error: 'No data found in the file'
        },
        { status: 400 }
      );
    }

    if (!dataRows.length) {
      return NextResponse.json(
        {
          success: false,
          step: 'DATA_ROWS_VALIDATION',
          error: 'No valid data rows found'
        },
        { status: 400 }
      );
    }

    const fileKey = generateFileKey(file.name, {
      folder: 'uploads',
      subFolder: 'imports',
      schoolId
    });

    let fileUrl;

    try {
      fileUrl = await uploadToR2(
        fileKey,
        buffer,
        file.type ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'uploadToR2',
          error:
            error.message || 'Failed to upload file to storage'
        },
        { status: 500 }
      );
    }

    let jobId;
    let totalRows;
    let chunks;

    try {
      jobId = createJobId(`import_${moduleKey}`);

      totalRows = dataRows.length;

      chunks = buildQueuedChunks(totalRows);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'JOB_SETUP',
          error:
            error.message || 'Failed to prepare import job'
        },
        { status: 500 }
      );
    }

    let history;

    try {
      history = await prisma.importHistory.create({
        data: {
          schoolId,
          module: moduleKey,
          fileName: file.name,
          totalRows,
          success: 0,
          failed: 0,
          importedBy,
          errors: {
            jobId,
            status: 'queued',
            processedRows: 0,
            totalRows,
            chunkSize: CHUNK_SIZE,
            totalChunks: chunks.length,
            fileUrl,
            errorReportUrl: null
          }
        }
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'prisma.importHistory.create',
          error:
            error.message || 'Failed to create import history'
        },
        { status: 500 }
      );
    }

    try {
      await setBulkJob(jobId, {
        id: jobId,
        type: 'import',
        schoolId,
        moduleKey,
        sheetName,
        fileName: file.name,
        fileUrl,
        importedBy,
        sendEmails,
        classMappings,
        sectionMappings,
        academicYearId,
        academicYearName: academicYear?.name || null,
        historyId: history.id,
        status: 'queued',
        chunkSize: CHUNK_SIZE,
        totalRows,
        processedRows: 0,
        success: 0,
        failed: 0,
        accountsCreated: 0,
        accountsFailed: 0,
        importedWithWarnings: 0,
        missingJoiningDate: 0,
        credentials: [],
        chunks,
        failedRows: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString()
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'setBulkJob',
          error:
            error.message || 'Failed to store bulk job'
        },
        { status: 500 }
      );
    }

    try {
      await enqueueWorker(jobId);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          step: 'enqueueWorker',
          error:
            error.message || 'Failed to enqueue worker'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      historyId: history.id,
      status: 'queued',
      totalRows,
      totalChunks: chunks.length,
      chunkSize: CHUNK_SIZE
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        step: 'POST_HANDLER',
        error:
          error.message || 'Failed to start import job'
      },
      { status: 500 }
    );
  }
});
export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params;
    const jobs = (await listBulkJobs({ schoolId, type: 'import' }))
      .filter((job) => job.status !== 'cancelled');
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[IMPORT JOB LIST ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch jobs' }, { status: 500 });
  }
});
