import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch import history for a school
export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page = '1', limit = '20', module } = searchParams;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      schoolId,
      ...(module && module !== 'all' ? { module } : {})
    };

    const [history, total] = await Promise.all([
    prisma.importHistory.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true, profilePicture: true }
        },
        importBatch: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.importHistory.count({ where })]
    );

    const normalizedHistory = history.map((item) => ({
      ...item,
      credentials: item.errors?.credentials || [],
      failedRows: item.errors?.failedRows || [],
      errorReportUrl: item.errors?.errorReportUrl || null,
      fileUrl: item.errors?.fileUrl || null,
      importedWithWarnings: item.errors?.importedWithWarnings || 0,
      missingJoiningDate: item.errors?.missingJoiningDate || 0,
      unresolvedEnrollmentCount: item.importBatch?.unresolvedEnrollmentCount || item.errors?.unresolvedEnrollmentCount || 0,
      rollbackStatus: item.importBatch?.rollbackStatus || null,
      importBatchId: item.importBatch?.id || null,
      importedSession: item.importBatch?.academicYearId || null,
    }));

    return NextResponse.json({
      history: normalizedHistory,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error('[IMPORT HISTORY ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
