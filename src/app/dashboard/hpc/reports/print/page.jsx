'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import HPCPDFTemplate from '@/components/hpc/HPCPDFTemplate';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HPCBulkPrintPage() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('classId');
    const termNumber = searchParams.get('term');
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [shouldPrint, setShouldPrint] = useState(false);

    // Fetch Bulk Data
    const { data, isLoading, error } = useQuery({
        queryKey: ['hpc-bulk-print', schoolId, classId, termNumber],
        queryFn: async () => {
            if (!schoolId || !classId || !termNumber) return null;
            const res = await fetch(`/api/schools/${schoolId}/hpc/bulk-reports?classId=${classId}&termNumber=${termNumber}`);
            if (!res.ok) throw new Error('Failed to load reports');
            return res.json();
        },
        enabled: !!schoolId && !!classId && !!termNumber,
    });

    useEffect(() => {
        if (data?.reports?.length > 0 && !isLoading) {
            // Wait for images/rendering then print
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [data, isLoading]);

    if (!classId || !termNumber) {
        return <div className="p-8 text-center text-red-500">Missing class or term parameter</div>;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-muted-foreground">Generating Class Reports...</p>
                <p className="text-xs text-muted-foreground mt-2">Please wait, this may take a moment.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
                <AlertCircle className="w-8 h-8 mb-4" />
                <p>Failed to generate reports: {error.message}</p>
            </div>
        );
    }

    if (!data?.reports || data.reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-muted-foreground">No students found for this class.</p>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="print:hidden p-4 bg-gray-100 flex justify-between items-center sticky top-0 z-10 border-b">
                <div>
                    <h1 className="font-bold">Bulk Print Preview</h1>
                    <p className="text-xs text-gray-500">
                        {data.reports.length} students loaded. Printing should start automatically.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.close()}>Close</Button>
                    <Button onClick={() => window.print()}>Print Now</Button>
                </div>
            </div>

            <div className="print-content">
                {data.reports.map((report, index) => (
                    <div key={report.student?.id || index} className="print-page">
                        <HPCPDFTemplate
                            data={report}
                            studentInfo={report.student}
                            schoolInfo={report.school} // API should return this, or we mock/fetch separate
                            termInfo={{ termNumber, academicYear: '2024-25' }} // Mocking year for now or needs to be in API
                        />
                        {/* Force page break after each report */}
                        <div className="page-break" />
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; padding: 0; background: white; }
                    .print:hidden { display: none; }
                    .page-break { page-break-after: always; }
                    .print-page { padding: 0; margin: 0; }
                }
            `}</style>
        </div>
    );
}
