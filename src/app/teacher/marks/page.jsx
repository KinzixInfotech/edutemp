'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const TeacherMarksContent = dynamic(() => import('@/components/teacher/TeacherMarksContent'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
    ),
});

export default function TeacherMarksPage() {
    return <TeacherMarksContent />;
}
