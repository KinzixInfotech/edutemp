import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function ServicesTab({ schoolId }) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        module: 'CUSTOM', // TRANSPORT, ACTIVITY, HOSTEL, CUSTOM
        monthlyFee: '',
        isActive: true,
    });

    const { data: servicesData, isLoading } = useQuery({
        queryKey: ['services', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/services?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch services');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const services = servicesData?.services || [];

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const isEditing = !!editingService;
            const url = isEditing
                ? `/api/schools/fee/services?id=${editingService.id}`
                : `/api/schools/fee/services`;

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, schoolId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save service');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editingService ? 'Service updated' : 'Service created');
            queryClient.invalidateQueries(['services', schoolId]);
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/fee/services?id=${id}&schoolId=${schoolId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete service');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Service deleted');
            queryClient.invalidateQueries(['services', schoolId]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleOpenDialog = (service = null) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name: service.name,
                module: service.module,
                monthlyFee: service.monthlyFee?.toString() || '',
                isActive: service.isActive,
            });
        } else {
            setEditingService(null);
            setFormData({
                name: '',
                module: 'CUSTOM',
                monthlyFee: '',
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.monthlyFee) {
            return toast.error("Please fill all required fields");
        }
        saveMutation.mutate({
            name: formData.name,
            module: formData.module,
            monthlyFee: parseFloat(formData.monthlyFee),
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
                    <CardTitle className="flex items-center gap-2">Services / Extra-curriculars</CardTitle>
                    <CardDescription>Manage optional services that students can subscribe to (Transport, Hostel, Activities).</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Service
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service Name</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Monthly Fee</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                                        No services found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                services.map(service => (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell>{service.module}</TableCell>
                                        <TableCell>₹{service.monthlyFee}</TableCell>
                                        <TableCell>
                                            {service.isActive ? (
                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">Active</span>
                                            ) : (
                                                <span className="text-gray-500 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">Inactive</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(service)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => {
                                                if (window.confirm("Delete this service? This cannot be undone.")) {
                                                    deleteMutation.mutate(service.id);
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
                            <DialogTitle>{editingService ? 'Edit Service' : 'New Service'}</DialogTitle>
                            <DialogDescription>Define an optional service for students.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Service Name *</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Swimming Club" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Service Module</Label>
                                    <Select value={formData.module} onValueChange={v => setFormData({ ...formData, module: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TRANSPORT">Transport</SelectItem>
                                            <SelectItem value="HOSTEL">Hostel</SelectItem>
                                            <SelectItem value="ACTIVITY">Activity</SelectItem>
                                            <SelectItem value="CUSTOM">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Default Monthly Fee (₹) *</Label>
                                    <Input
                                        type="number"
                                        value={formData.monthlyFee}
                                        onChange={e => setFormData({ ...formData, monthlyFee: e.target.value })}
                                        placeholder="1000"
                                    />
                                </div>
                            </div>

                            <div className="flex bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex-row gap-2">
                                <Info className="w-4 h-4 shrink-0" />
                                <p>You can optionally override this monthly fee per student when assigning them the service.</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                                <Label>Active</Label>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <Button className="flex-1" onClick={handleSave} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Service'}
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
