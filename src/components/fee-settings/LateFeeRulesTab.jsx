import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function LateFeeRulesTab({ schoolId }) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'FIXED', // FIXED or PERCENTAGE
        amount: '',
        percentage: '',
        graceDays: '15',
        isActive: true,
    });

    const { data: rulesData, isLoading } = useQuery({
        queryKey: ['late-fee-rules', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/late-fee-rules?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch late fee rules');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const rules = rulesData?.rules || [];

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const isEditing = !!editingRule;
            const url = isEditing
                ? `/api/schools/fee/late-fee-rules?id=${editingRule.id}`
                : `/api/schools/fee/late-fee-rules`;

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, schoolId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save rule');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editingRule ? 'Rule updated' : 'Rule created');
            queryClient.invalidateQueries(['late-fee-rules', schoolId]);
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/fee/late-fee-rules?id=${id}&schoolId=${schoolId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete rule');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Rule deleted');
            queryClient.invalidateQueries(['late-fee-rules', schoolId]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleOpenDialog = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                name: rule.name,
                type: rule.type,
                amount: rule.amount?.toString() || '',
                percentage: rule.percentage?.toString() || '',
                graceDays: rule.graceDays?.toString() || '',
                isActive: rule.isActive,
            });
        } else {
            setEditingRule(null);
            setFormData({
                name: '',
                type: 'FIXED',
                amount: '',
                percentage: '',
                graceDays: '15',
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.name) {
            return toast.error("Rule name is required");
        }
        saveMutation.mutate({
            name: formData.name,
            type: formData.type,
            amount: formData.type === 'FIXED' ? parseFloat(formData.amount || 0) : 0,
            percentage: formData.type === 'PERCENTAGE' ? parseFloat(formData.percentage || 0) : 0,
            graceDays: parseInt(formData.graceDays || 0),
            isActive: formData.isActive,
        });
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <Card>
            <CardHeader className="border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">Late Fee Rules</CardTitle>
                    <CardDescription>Configure rules to automatically apply late fees to overdue ledger entries.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Rule
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rule Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount/Percentage</TableHead>
                                <TableHead>Grace Period</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground p-8">
                                        No late fee rules configured.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rules.map(rule => (
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">{rule.name}</TableCell>
                                        <TableCell>{rule.type}</TableCell>
                                        <TableCell>
                                            {rule.type === 'FIXED' ? `₹${rule.amount}` : `${rule.percentage}%`}
                                        </TableCell>
                                        <TableCell>{rule.graceDays} days</TableCell>
                                        <TableCell>
                                            {rule.isActive ? (
                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">Active</span>
                                            ) : (
                                                <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">Inactive</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(rule)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => {
                                                if (window.confirm("Delete this rule?")) {
                                                    deleteMutation.mutate(rule.id);
                                                }
                                            }}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingRule ? 'Edit Late Fee Rule' : 'New Late Fee Rule'}</DialogTitle>
                            <DialogDescription>Define how late fees are calculated for overdue payments.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Rule Name *</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Standard Late Fee" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Grace Period (Days)</Label>
                                    <Input
                                        type="number"
                                        value={formData.graceDays}
                                        onChange={e => setFormData({ ...formData, graceDays: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{formData.type === 'FIXED' ? 'Amount (₹) *' : 'Percentage (%) *'}</Label>
                                <Input
                                    type="number"
                                    value={formData.type === 'FIXED' ? formData.amount : formData.percentage}
                                    onChange={e => {
                                        if (formData.type === 'FIXED') setFormData({ ...formData, amount: e.target.value });
                                        else setFormData({ ...formData, percentage: e.target.value });
                                    }}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                                <Label>Active</Label>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <Button className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Rule'}
                                </Button>
                                <Button className="flex-1" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
