'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Download, ArrowRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const receipt = searchParams.get('receipt') || 'N/A';

    useEffect(() => {
        // Trigger confetti on load
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults, draggable: false,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults, draggable: false,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg border-t-8 border-t-green-500">
                <CardHeader className="text-center pb-2">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-green-700">Payment Successful!</CardTitle>
                    <p className="text-muted-foreground mt-2">
                        Thank you! Your payment has been processed successfully.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">Receipt Number</span>
                            <span className="font-mono font-medium">{receipt}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Date</span>
                            <span className="text-sm">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full flex items-center gap-2" variant="outline" onClick={() => toast.info('Download feature coming soon')}>
                        <Download className="w-4 h-4" /> Download Receipt
                    </Button>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push('/pay/dashboard')}>
                        <Home className="w-4 h-4 mr-2" /> Return to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Receipt...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
