'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Zap, XCircle, CheckCircle2, Plus } from 'lucide-react';

export default function PaymentDevTools() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [gateway, setGateway] = useState('ICICI_EAZYPAY');
    const [orderId, setOrderId] = useState('');
    const [amount, setAmount] = useState('1.00');
    const [transactionId, setTransactionId] = useState(`TXN_${Date.now()}`);

    const createMockPaymentMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/payment/dev/create-mock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId, amount }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create mock payment');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setOrderId(data.orderId);
            toast.success(data.message);
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const simulateCallbackMutation = useMutation({
        mutationFn: async ({ status }) => {
            const payload = {
                orderId, // This must match the 'gatewayOrderId' in FeePayment model
                status,
                transactionId: status === 'SUCCESS' ? transactionId : undefined,
                amount: status === 'SUCCESS' ? amount : undefined,
                // Add mock bank params as needed by the generic handler
                ResponseCode: status === 'SUCCESS' ? 'E000' : 'E001',
                ResponseMessage: status === 'SUCCESS' ? 'Transaction Successful' : 'Transaction Failed',
            };

            const res = await fetch(`/api/payment/callback/${gateway}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Callback simulation failed');
            }

            // If it redirects, we might just get a 200/302. 
            // The handler returns a redirect but fetch follows it automatically? 
            // Actually, we want to see the result. 
            // If the API returns a redirect, browser fetch follows it.
            // Let's assume the API returns JSON or redirects. 
            // If redirect, we just say "Simulated".
            return res;
        },
        onSuccess: () => {
            toast.success('Callback simulated successfully check payment status');
        },
        onError: (err) => {
            toast.error(`Simulation Failed: ${err.message}`);
        }
    });

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    Payment Callback Simulator
                </h1>
                <p className="text-muted-foreground">
                    Use this tool to simulate bank server-to-server callbacks during development.
                    Do not use in production.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Simulate Transaction</CardTitle>
                    <CardDescription>Triggers the callback webhook handler for the selected gateway</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Gateway</Label>
                        <Select value={gateway} onValueChange={setGateway}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ICICI_EAZYPAY">ICICI Eazypay</SelectItem>
                                <SelectItem value="SBI_COLLECT">SBI Collect</SelectItem>
                                <SelectItem value="HDFC_SMARTHUB">HDFC SmartHub</SelectItem>
                                <SelectItem value="AXIS_EASYPAY">Axis EasyPay</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Order ID (Must match Pending Payment)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="e.g. ord_12345678"
                            />
                            <Button
                                variant="outline"
                                onClick={() => createMockPaymentMutation.mutate()}
                                disabled={createMockPaymentMutation.isPending}
                            >
                                {createMockPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Create Mock
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Generate a mock pending payment in DB if you don't have one.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Mock Transaction ID</Label>
                        <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => simulateCallbackMutation.mutate({ status: 'SUCCESS' })}
                            disabled={simulateCallbackMutation.isPending || !orderId}
                        >
                            {simulateCallbackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Simulate Success
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={() => simulateCallbackMutation.mutate({ status: 'FAILURE' })}
                            disabled={simulateCallbackMutation.isPending || !orderId}
                        >
                            {simulateCallbackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Simulate Failure
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
