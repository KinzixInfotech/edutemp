'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Loader2,
    DollarSign,
    Save,
    Plus,
    Trash2,
    Edit,
    Package,
    Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEFAULT_COST_PER_CREDIT = 0.20;
const DEFAULT_PACKS = [
    { credits: 100, price: 20, enabled: true },
    { credits: 500, price: 100, enabled: true },
    { credits: 1000, price: 200, enabled: true },
];

export default function SmsPricingPage() {
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPack, setEditingPack] = useState(null);
    const [costPerCredit, setCostPerCredit] = useState(DEFAULT_COST_PER_CREDIT);
    const [minPurchase, setMinPurchase] = useState(100);
    const [packs, setPacks] = useState(DEFAULT_PACKS);

    // Fetch pricing config
    const { data: config, isLoading } = useQuery({
        queryKey: ['sms-pricing-config'],
        queryFn: async () => {
            const res = await fetch('/api/sms/admin/pricing');
            if (!res.ok) {
                // Return defaults if not configured
                return {
                    costPerCredit: DEFAULT_COST_PER_CREDIT,
                    minPurchase: 100,
                    packs: DEFAULT_PACKS,
                };
            }
            return res.json();
        },
    });

    // Sync state when config loads
    React.useEffect(() => {
        if (config) {
            setCostPerCredit(config.costPerCredit);
            setMinPurchase(config.minPurchase);
            setPacks(config.packs);
        }
    }, [config]);

    // Save pricing mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/sms/admin/pricing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, role: 'SUPER_ADMIN' }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-pricing-config']);
            toast.success('Pricing configuration saved');
        },
        onError: (error) => toast.error(error.message),
    });

    const handleSave = () => {
        saveMutation.mutate({
            costPerCredit: parseFloat(costPerCredit),
            minPurchase: parseInt(minPurchase),
            packs,
        });
    };

    const handleAddPack = () => {
        setEditingPack({ credits: 0, price: 0, enabled: true, isNew: true });
        setIsEditOpen(true);
    };

    const handleEditPack = (pack, index) => {
        setEditingPack({ ...pack, index });
        setIsEditOpen(true);
    };

    const handleSavePack = () => {
        if (editingPack.isNew) {
            setPacks([...packs, {
                credits: parseInt(editingPack.credits),
                price: parseFloat(editingPack.price),
                enabled: true
            }]);
        } else {
            const updated = [...packs];
            updated[editingPack.index] = {
                credits: parseInt(editingPack.credits),
                price: parseFloat(editingPack.price),
                enabled: editingPack.enabled,
            };
            setPacks(updated);
        }
        setIsEditOpen(false);
        setEditingPack(null);
    };

    const handleDeletePack = (index) => {
        setPacks(packs.filter((_, i) => i !== index));
    };

    const handleTogglePack = (index) => {
        const updated = [...packs];
        updated[index].enabled = !updated[index].enabled;
        setPacks(updated);
    };

    if (isLoading) {
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
                    <h1 className="text-3xl font-bold tracking-tight">Pricing & Credit Packs</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure SMS pricing and credit pack options for schools
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <Separator />

            {/* Pricing Config */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Base Pricing
                        </CardTitle>
                        <CardDescription>Set the cost per SMS/credit</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cost per Credit (₹)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={costPerCredit}
                                onChange={(e) => setCostPerCredit(e.target.value)}
                                placeholder="0.20"
                            />
                            <p className="text-xs text-muted-foreground">
                                1 credit = 1 SMS. Schools pay this amount per credit.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Minimum Purchase (Credits)</Label>
                            <Input
                                type="number"
                                value={minPurchase}
                                onChange={(e) => setMinPurchase(e.target.value)}
                                placeholder="100"
                            />
                            <p className="text-xs text-muted-foreground">
                                Minimum credits for custom amount purchases.
                            </p>
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Changes will apply to new purchases only. Existing balances are not affected.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Quick Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Current Rate</p>
                                <p className="text-2xl font-bold">₹{costPerCredit}/SMS</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Active Packs</p>
                                <p className="text-2xl font-bold">{packs.filter(p => p.enabled).length}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">Pricing Example</p>
                            <p className="text-lg font-medium text-green-800 dark:text-green-200">
                                100 SMS = ₹{(100 * costPerCredit).toFixed(0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Credit Packs */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Credit Packs</CardTitle>
                        <CardDescription>Pre-defined credit packages for schools</CardDescription>
                    </div>
                    <Button onClick={handleAddPack} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Pack
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {packs.map((pack, index) => (
                            <div
                                key={index}
                                className={`relative p-4 border-2 rounded-lg ${pack.enabled ? 'border-primary' : 'border-muted opacity-60'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">{pack.credits}</p>
                                        <p className="text-sm text-muted-foreground">credits</p>
                                    </div>
                                    <Switch
                                        checked={pack.enabled}
                                        onCheckedChange={() => handleTogglePack(index)}
                                    />
                                </div>
                                <p className="mt-2 text-xl font-semibold text-green-600">₹{pack.price}</p>
                                <p className="text-xs text-muted-foreground">
                                    ₹{(pack.price / pack.credits).toFixed(2)}/credit
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPack(pack, index)}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => handleDeletePack(index)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                {!pack.enabled && (
                                    <Badge variant="secondary" className="absolute top-2 right-2">
                                        Disabled
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Pack Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPack?.isNew ? 'Add' : 'Edit'} Credit Pack</DialogTitle>
                        <DialogDescription>Configure pack credits and pricing</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Credits</Label>
                            <Input
                                type="number"
                                value={editingPack?.credits || ''}
                                onChange={(e) => setEditingPack({ ...editingPack, credits: e.target.value })}
                                placeholder="100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Price (₹)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editingPack?.price || ''}
                                onChange={(e) => setEditingPack({ ...editingPack, price: e.target.value })}
                                placeholder="20"
                            />
                        </div>
                        {editingPack?.credits > 0 && editingPack?.price > 0 && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                Effective rate: ₹{(editingPack.price / editingPack.credits).toFixed(2)}/credit
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePack}>Save Pack</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
