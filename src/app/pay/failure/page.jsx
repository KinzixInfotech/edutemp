'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowRight, RefreshCcw } from 'lucide-react';

function FailureContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId') || 'N/A';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg border-t-8 border-t-red-500">
                <CardHeader className="text-center pb-2">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-700">Payment Failed</CardTitle>
                    <p className="text-muted-foreground mt-2">
                        We could not process your payment. Any deducted amount will be refunded within 5-7 business days.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-800 text-sm">
                        <strong>Order Reference:</strong> {orderId}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push('/pay/dashboard')}>
                        <RefreshCcw className="w-4 h-4 mr-2" /> Retry Payment
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function FailurePage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading details...</div>}>
            <FailureContent />
        </Suspense>
    );
}
