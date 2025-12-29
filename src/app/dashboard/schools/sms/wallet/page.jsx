'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Loader2,
    CreditCard,
    Plus,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SmsWalletPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [selectedPack, setSelectedPack] = useState('500'); // Default to 500
    const [customAmount, setCustomAmount] = useState('');
    const [rechargeForm, setRechargeForm] = useState({
        referenceId: '',
        notes: '',
    });

    // Fetch pricing config from admin
    const { data: pricingConfig, isLoading: isPricingLoading } = useQuery({
        queryKey: ['sms-pricing-config'],
        queryFn: async () => {
            const res = await fetch('/api/sms/admin/pricing');
            if (!res.ok) {
                // Fallback to defaults if pricing not configured
                return {
                    costPerCredit: 0.20,
                    minPurchase: 100,
                    packs: [
                        { credits: 100, price: 20, enabled: true },
                        { credits: 500, price: 100, enabled: true },
                        { credits: 1000, price: 200, enabled: true },
                    ],
                };
            }
            return res.json();
        },
        staleTime: 30 * 1000, // 30 seconds - fetch fresh pricing more frequently
        refetchOnMount: true, // Always refetch when component mounts
    });

    // Extract dynamic values from pricing config
    const COST_PER_CREDIT = pricingConfig?.costPerCredit || 0.20;
    const MIN_CUSTOM_CREDITS = pricingConfig?.minPurchase || 100;
    const CREDIT_PACKS = (pricingConfig?.packs || [])
        .filter(pack => pack.enabled)
        .sort((a, b) => a.credits - b.credits)
        .map((pack, index) => ({
            ...pack,
            popular: index === 1, // Mark middle pack as popular
        }));

    // Debug: Log pricing config to verify dynamic data is loaded
    console.log('💰 SMS Pricing Config:', { COST_PER_CREDIT, MIN_CUSTOM_CREDITS, CREDIT_PACKS, pricingConfig });


    // Fetch wallet
    const { data: wallet, isLoading } = useQuery({
        queryKey: ['sms-wallet', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/sms/wallet`);
            if (!res.ok) throw new Error('Failed to fetch wallet');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Recharge mutation (creates a pending request)
    const rechargeMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/sms/wallet/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Request failed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-wallet', schoolId]);
            setIsRechargeOpen(false);
            setSelectedPack('500');
            setCustomAmount('');
            setRechargeForm({ referenceId: '', notes: '' });
            toast.success('Recharge request submitted! Credits will be added after payment confirmation.');
        },
        onError: (error) => toast.error(error.message),
    });

    const getSelectedCredits = () => {
        if (selectedPack === 'custom') {
            return parseInt(customAmount) || 0;
        }
        return parseInt(selectedPack) || 0;
    };

    const getSelectedPrice = () => {
        if (selectedPack === 'custom') {
            // For custom amounts, calculate using costPerCredit
            const credits = parseInt(customAmount) || 0;
            return (credits * COST_PER_CREDIT).toFixed(0);
        }

        // For predefined packs, use the actual pack price from config
        const pack = CREDIT_PACKS.find(p => p.credits.toString() === selectedPack);
        if (pack) {
            return pack.price.toFixed(0);
        }

        // Fallback to calculation if pack not found
        const credits = getSelectedCredits();
        return (credits * COST_PER_CREDIT).toFixed(0);
    };

    const handleRecharge = () => {
        const credits = getSelectedCredits();

        if (selectedPack === 'custom' && credits < MIN_CUSTOM_CREDITS) {
            toast.error(`Minimum ${MIN_CUSTOM_CREDITS} credits required`);
            return;
        }

        if (credits <= 0) {
            toast.error('Please select or enter credits');
            return;
        }

        rechargeMutation.mutate({
            credits,
            amount: parseFloat(getSelectedPrice()),
            referenceId: rechargeForm.referenceId,
            notes: rechargeForm.notes,
        });
    };

    if (!schoolId || isPricingLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SMS Wallet</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage SMS credits and view transaction history
                    </p>
                </div>
                <Dialog open={isRechargeOpen} onOpenChange={setIsRechargeOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Buy Credits
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Recharge Wallet</DialogTitle>
                            <DialogDescription>
                                Select a credit pack to purchase
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5">
                            {/* Pricing Info */}
                            <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 p-3 rounded-lg">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                <span>1 SMS = 1 credit | ₹{COST_PER_CREDIT.toFixed(2)} per credit</span>
                            </div>

                            {/* Credit Pack Selection */}
                            <div className="space-y-3">
                                <Label>Select Credits</Label>
                                <RadioGroup
                                    value={selectedPack}
                                    onValueChange={(v) => {
                                        setSelectedPack(v);
                                        if (v !== 'custom') setCustomAmount('');
                                    }}
                                    className="space-y-3"
                                >
                                    <div className="grid grid-cols-3 gap-3">
                                        {CREDIT_PACKS.map((pack) => (
                                            <div key={pack.credits} className="relative">
                                                <RadioGroupItem
                                                    value={pack.credits.toString()}
                                                    id={`pack-${pack.credits}`}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={`pack-${pack.credits}`}
                                                    className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer
                                                        hover:bg-muted transition-colors
                                                        peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                                                >
                                                    <span className="text-2xl font-bold">{pack.credits}</span>
                                                    <span className="text-sm text-muted-foreground">credits</span>
                                                    <span className="mt-1 font-semibold text-green-600 dark:text-green-400">
                                                        ₹{pack.price}
                                                    </span>
                                                </Label>
                                                {pack.popular && (
                                                    <Badge className="absolute -top-2 -right-2 text-xs">
                                                        Popular
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Custom Amount */}
                                    <div className="relative">
                                        <RadioGroupItem
                                            value="custom"
                                            id="pack-custom"
                                            className="peer sr-only"
                                        />
                                        <Label
                                            htmlFor="pack-custom"
                                            className="flex"
                                        >
                                            <div
                                                className={`w-full p-4 border-2 rounded-lg cursor-pointer transition-colors
                                                    ${selectedPack === 'custom' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="font-medium">Custom Amount</p>
                                                        <p className="text-xs text-muted-foreground">Min {MIN_CUSTOM_CREDITS} credits</p>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        value={customAmount}
                                                        onChange={(e) => {
                                                            setCustomAmount(e.target.value);
                                                            setSelectedPack('custom');
                                                        }}
                                                        placeholder="Enter credits"
                                                        className="w-32"
                                                        min={MIN_CUSTOM_CREDITS}
                                                    />
                                                </div>
                                                {selectedPack === 'custom' && customAmount && (
                                                    <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
                                                        Cost: ₹{(parseInt(customAmount) * COST_PER_CREDIT).toFixed(0)}
                                                    </p>
                                                )}
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Reference & Notes */}
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Payment Reference ID (Optional)</Label>
                                    <Input
                                        value={rechargeForm.referenceId}
                                        onChange={(e) => setRechargeForm({ ...rechargeForm, referenceId: e.target.value })}
                                        placeholder="UPI/Bank transaction ID"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes (Optional)</Label>
                                    <Input
                                        value={rechargeForm.notes}
                                        onChange={(e) => setRechargeForm({ ...rechargeForm, notes: e.target.value })}
                                        placeholder="Any additional notes"
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span>Credits</span>
                                    <span className="font-bold">{getSelectedCredits()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount to Pay</span>
                                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                                        ₹{getSelectedPrice()}
                                    </span>
                                </div>
                            </div>

                            {/* Manual Payment Note */}
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    After payment, credits will be added by admin within 24 hours.
                                    Contact support if not reflected.
                                </AlertDescription>
                            </Alert>

                            {/* Submit Button */}
                            <Button
                                onClick={handleRecharge}
                                className="w-full"
                                disabled={rechargeMutation.isPending || getSelectedCredits() < MIN_CUSTOM_CREDITS}
                            >
                                {rechargeMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>Request {getSelectedCredits()} Credits (₹{getSelectedPrice()})</>
                                )}
                            </Button>

                            {/* Disclaimer */}
                            <p className="text-xs text-center text-muted-foreground">
                                Credits are governed by TRAI DLT rules and are non-refundable once used.
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">Current Balance</CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{wallet?.balance?.toFixed(0) || '0'}</div>
                        <p className="text-xs text-blue-100 mt-1">
                            Credits (≈ ₹{((wallet?.balance || 0) * COST_PER_CREDIT).toFixed(0)} value)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{wallet?.totalCredits?.toFixed(0) || '0'}</div>
                        <p className="text-xs text-muted-foreground mt-1">All time credits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">SMS Sent</CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{wallet?.usedCredits?.toFixed(0) || '0'}</div>
                        <p className="text-xs text-muted-foreground mt-1">Credits used</p>
                    </CardContent>
                </Card>
            </div>

            {/* Pricing Info */}
            <div className="flex items-center gap-2 text-sm bg-muted p-3 rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                    <strong>Pricing:</strong> 1 SMS = 1 credit = ₹{COST_PER_CREDIT.toFixed(2)} |
                    <strong> Your balance:</strong> {wallet?.balance?.toFixed(0) || 0} credits can send {wallet?.balance?.toFixed(0) || 0} SMS
                </span>
            </div>

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent credit transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : wallet?.transactions?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No transactions yet. Purchase credits to get started!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {wallet?.transactions?.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${txn.amount > 0
                                            ? 'bg-green-100 dark:bg-green-900'
                                            : 'bg-red-100 dark:bg-red-900'
                                            }`}>
                                            {txn.amount > 0 ? (
                                                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{txn.description || txn.type}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(txn.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold text-lg ${txn.amount > 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {txn.amount > 0 ? '+' : ''}{txn.amount} credits
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                            ≈ ₹{Math.abs(txn.amount * COST_PER_CREDIT).toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
