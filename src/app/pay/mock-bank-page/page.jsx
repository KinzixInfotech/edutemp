'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Copy, XCircle, ArrowRight, Wallet, Building2, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// To handle search params in client component
function MockBankContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Params from MockAdapter
    const amount = searchParams.get('amount') || '0.00';
    const orderId = searchParams.get('orderId') || 'UNKNOWN_ORDER';
    const returnUrl = searchParams.get('returnUrl');
    const provider = searchParams.get('provider') || 'TEST_BANK';

    // Simulated bank details based on provider
    const getBankTheme = (code) => {
        const c = code?.toUpperCase();
        if (c?.includes('ICICI')) return { name: 'ICICI Bank', color: 'bg-orange-600', logo: 'https://logo.clearbit.com/icicibank.com' };
        if (c?.includes('SBI')) return { name: 'SBI', color: 'bg-blue-600', logo: 'https://logo.clearbit.com/onlinesbi.sbi' };
        if (c?.includes('HDFC')) return { name: 'HDFC Bank', color: 'bg-blue-800', logo: 'https://logo.clearbit.com/hdfcbank.com' };
        if (c?.includes('AXIS')) return { name: 'Axis Bank', color: 'bg-purple-700', logo: 'https://logo.clearbit.com/axisbank.com' };
        return { name: 'Test Bank Gateway', color: 'bg-slate-700', logo: null };
    };

    const bank = getBankTheme(provider);

    const handleCopy = () => {
        navigator.clipboard.writeText(orderId);
        toast.success("Order ID copied to clipboard");
    };

    const handlePayment = async (status) => {
        setIsProcessing(true);
        try {
            // Using the new Simulator API we built to trigger the callback
            // (Assuming existing simulator endpoint logic effectively, OR directly POSTing to callback like real bank)
            // Real banks POST to the returnURL or callbackURL. 
            // The returnUrl param passed by adapter is usually the callback API.

            // Let's emulate what the bank would do: Browser redirect or S2S call?
            // Usually S2S call happens then browser redirects.
            // For this mock page, we can hit the simulator API we made? 
            // OR just POST to the callback endpoint directly?

            // Let's try POSTing to the Callback endpoint directly from client (acting as server)
            // But we need to use the `provider` from params.

            // Actually, the user's simulator tool does this nicely.
            // Let's call the callback API directly. 

            // Construct the payload as per the Generic Callback Handler expectations
            const payload = {
                orderId: orderId,
                status: status,
                transactionId: `MOCK_TXN_${Date.now()}`,
                amount: amount,
                // Add any other bank specific params if needed by the generic handler logic
            };

            const callbackEndpoint = `/api/payment/callback/${provider}`;

            const res = await fetch(callbackEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // After callback is processed (S2S simulated via client fetch), 
            // we redirect the user to success/failure page which the backend usually does.
            // But here we are the "Bank Page".
            // If the callback returns a redirect (302), fetch might follow it or return the final HTML.
            // The backend callback returns NextResponse.redirect.

            if (res.redirected) {
                window.location.href = res.url;
                return;
            }

            // If it didn't redirect (maybe error?), check status
            if (!res.ok) {
                const error = await res.json();
                toast.error(`Bank Error: ${error.error}`);
                setIsProcessing(false);
                return;
            }

            // If generic handler returns JSON (shouldn't if it redirects, but just in case)
            window.location.href = `/pay/${status === 'SUCCESS' ? 'success' : 'failure'}?orderId=${orderId}`;

        } catch (error) {
            toast.error("Simulation failed");
            console.error(error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Bank Header */}
            <header className={`${bank.color} text-white p-4 shadow-lg`}>
                <div className="container mx-auto max-w-md flex items-center gap-3">
                    {bank.logo && (
                        <div className="bg-white p-1 rounded w-10 h-10 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-lg">{bank.name} Secure Gateway</h1>
                        <p className="text-xs opacity-90 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 128-bit SSL Encrypted
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 flex items-center justify-center">
                <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-yellow-500">
                    <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 pb-2">
                        <AlertTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-bold">
                            <AlertTriangle className="w-5 h-5" />
                            DO NOT CLOSE THIS WINDOW
                        </AlertTitle>
                        <CardTitle className="text-center pt-4 text-2xl font-bold">
                            ₹{amount}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {/* Order ID Section */}
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Merchant Order Reference</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 font-mono text-sm bg-white dark:bg-black p-2 rounded border truncate">
                                    {orderId}
                                </code>
                                <Button size="icon" variant="outline" onClick={handleCopy} title="Copy Order ID">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                *Copy this ID if you need to manually reconcile or debug.
                            </p>
                        </div>

                        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
                                You are paying to <strong>EduBreezy School Account</strong> via {bank.name}.
                            </AlertDescription>
                        </Alert>

                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 pt-2 bg-gray-50 dark:bg-gray-900/50">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-medium shadow-md transition-all active:scale-[0.98]"
                            onClick={() => handlePayment('SUCCESS')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Wallet className="mr-2 w-5 h-5" />}
                            PAY NOW (Simulate Success)
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handlePayment('FAILURE')}
                            disabled={isProcessing}
                        >
                            <XCircle className="mr-2 w-4 h-4" />
                            Cancel / Fail Transaction
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}

export default function MockBankPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Gateway...</div>}>
            <MockBankContent />
        </Suspense>
    );
}
