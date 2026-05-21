'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useQuery } from '@tanstack/react-query';

export default function UnresolvedEnrollmentBanner() {
  const { fullUser } = useAuth();
  const { selectedYear, activeYear } = useAcademicYear() || {};
  const schoolId = fullUser?.schoolId;
  const academicYear = selectedYear || activeYear;

  const { data } = useQuery({
    queryKey: ['unresolved-enrollment-summary', schoolId, academicYear?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (academicYear?.id) params.set('academicYearId', academicYear.id);
      const res = await fetch(`/api/schools/${schoolId}/enrollment-resolution/summary?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load unresolved enrollment summary');
      return json;
    },
    enabled: !!schoolId,
    staleTime: 30 * 1000,
  });

  if (!data?.hasUnresolved) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>{data.count} students are not enrolled in active session {data.academicYear?.name ? `(${data.academicYear.name})` : ''}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Historical imports require enrollment resolution before those students become operational.</span>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/dashboard/schools/students/enrollment-resolution">Resolve Now</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/schools/students/registry">Review Students</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
