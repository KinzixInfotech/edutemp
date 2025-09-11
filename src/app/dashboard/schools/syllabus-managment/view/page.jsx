'use client';

import { useSearchParams } from 'next/navigation';

export default function PdfViewerPage() {
    const searchParams = useSearchParams();
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
        return (
            <div className="p-6">
                <p className="text-red-500">No PDF URL provided.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-screen">
            <iframe
                src={fileUrl}
                className="w-full h-full"
                style={{ border: 'none' }}
                title="PDF Viewer"
            />
        </div>
    );
}
