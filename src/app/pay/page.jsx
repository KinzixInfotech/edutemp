'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the main content with no SSR to avoid useSearchParams issues
const PayPageContent = dynamic(() => import('@/components/pay/PayPageContent'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0569ff] mx-auto mb-4" />
                <p className="text-gray-500">Loading...</p>
            </div>
        </div>
    ),
});

export default function PayPage() {
    return <PayPageContent />;
}
