import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SessionManagementTab({ schoolId, userId }) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);

    const [formData, setFormData] = useState({
        academicYearId: '',
        name: '',
        startMonth: '',
        endMonth: '',
        dueDayOfMonth: '10',
        isActive: true,
    });

    const { data: sessionData, isLoading } = useQuery({
        queryKey: ['fee-sessions', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/sessions?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch sessions');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const sessions = sessionData?.sessions || [];
    const academicYears = sessionData?.academicYears || [];

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const isEditing = !!editingSession;
            const url = isEditing
                ? `/api/schools/fee/sessions?id=${editingSession.id}`
                : `/api/schools/fee/sessions`;

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, schoolId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save session');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editingSession ? 'Session updated' : 'Session created');
            queryClient.invalidateQueries(['fee-sessions', schoolId]);
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, action }) => {
            const res = await fetch(`/api/schools/fee/sessions?id=${id}&action=${action}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Failed to ${action} session`);
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            toast.success(`Session ${variables.action === 'close' ? 'closed' : 're-opened'} successfully`);
            queryClient.invalidateQueries(['fee-sessions', schoolId]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleOpenDialog = (session = null) => {
        if (session) {
            setEditingSession(session);
            setFormData({
                academicYearId: session.academicYearId,
                name: session.name,
                startMonth: new Date(session.startMonth).toISOString().slice(0, 7), // YYYY-MM Format
                endMonth: new Date(session.endMonth).toISOString().slice(0, 7),
                dueDayOfMonth: session.dueDayOfMonth?.toString() || '10',
                isActive: session.isActive,
            });
        } else {
            setEditingSession(null);
            setFormData({
                academicYearId: academicYears[0]?.id || '',
                name: '',
                startMonth: '',
                endMonth: '',
                dueDayOfMonth: '10',
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.academicYearId || !formData.name || !formData.startMonth || !formData.endMonth) {
            return toast.error("Please fill all required fields");
        }
        // append -01 to make it a valid date
        const start = `${formData.startMonth}-01`;
        const end = `${formData.endMonth}-01`;

        saveMutation.mutate({
            academicYearId: formData.academicYearId,
            name: formData.name,
            startMonth: start,
            endMonth: end,
            dueDayOfMonth: parseInt(formData.dueDayOfMonth),
            isActive: formData.isActive,
        });
    };

    const handleAction = (session, action) => {
        if (action === 'close') {
            if (window.confirm("Are you sure you want to CLOSE this session? All payments and changes will be frozen.")) {
                actionMutation.mutate({ id: session.id, action });
            }
        } else {
            if (window.confirm("Are you sure you want to RE-OPEN this session?")) {
                actionMutation.mutate({ id: session.id, action });
            }
        }
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <Card>
            <CardHeader className="border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">Fee Sessions / Cycles</CardTitle>
                    <CardDescription>Manage your academic fee collection cycles and lock periods.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Session
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Session Name</TableHead>
                                <TableHead>Academic Year</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Components</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground p-8">
                                        No fee sessions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.map(session => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">
                                            {session.name}
                                            {session.isClosed && (
                                                <Badge variant="outline" className="ml-2 text-xs border-red-200 text-red-700 bg-red-50">Locked</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{session.academicYear?.name}</TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(session.startMonth).toLocaleString('en-IN', { month: 'short', year: 'numeric' })} - 
                                            {new Date(session.endMonth).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell>{session._count?.components || 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={session.isActive ? 'default' : 'secondary'}>
                                                {session.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {!session.isClosed && (
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(session)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {session.isClosed ? (
                                                <Button variant="ghost" size="sm" onClick={() => handleAction(session, 'open')}>
                                                    <Unlock className="w-4 h-4 text-green-600" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => handleAction(session, 'close')}>
                                                    <Lock className="w-4 h-4 text-red-600" />
                                                </Button>
                                            )}
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
                            <DialogTitle>{editingSession ? 'Edit Fee Session' : 'New Fee Session'}</DialogTitle>
                            <DialogDescription>Create a bounding period for a financial ledger engine cycle.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            {!editingSession && (
                                <div className="space-y-2">
                                    <Label>Academic Year *</Label>
                                    <Select value={formData.academicYearId} onValueChange={v => setFormData({ ...formData, academicYearId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                                        <SelectContent>
                                            {academicYears.map(ay => (
                                                <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Session Name *</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. 2024-25 Core Term" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Month *</Label>
                                    <Input
                                        type="month"
                                        value={formData.startMonth}
                                        onChange={e => setFormData({ ...formData, startMonth: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Month *</Label>
                                    <Input
                                        type="month"
                                        value={formData.endMonth}
                                        onChange={e => setFormData({ ...formData, endMonth: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Default Due Day *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={formData.dueDayOfMonth}
                                    onChange={e => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">The day of the month when monthly fees are due.</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                                <Label>Active Status</Label>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <Button className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Session'}
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
