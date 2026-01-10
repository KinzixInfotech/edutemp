'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the main content with no SSR to avoid useSearchParams issues
const TeacherPageContent = dynamic(() => import('@/components/teacher/TeacherPageContent'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading Teacher Portal...</p>
            </div>
        </div>
    ),
});

export default function TeacherPage() {
    return <TeacherPageContent />;
}
