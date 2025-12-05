'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function FacilitiesManagement() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [facilityName, setFacilityName] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['school-facilities', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/facilities`);
            if (!response.ok) throw new Error('Failed to fetch');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const createMutation = useMutation({
        mutationFn: async (name) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/facilities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to create');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-facilities']);
            setIsDialogOpen(false);
            setFacilityName('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/facilities?id=${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-facilities']);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (facilityName.trim()) {
            createMutation.mutate(facilityName);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Facilities</h1>
                    <p className="text-muted-foreground">Manage your school's facilities and amenities</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Facility
                </Button>
            </div>

            {data?.facilities && data.facilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.facilities.map((facility) => (
                        <Card key={facility.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="font-medium">{facility.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(facility.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xl text-muted-foreground mb-2">No facilities added yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Start listing your school's amenities</p>
                    <Button onClick={() => setIsDialogOpen(true)}>Add First Facility</Button>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Facility</DialogTitle>
                        <DialogDescription>Add a new facility or amenity for your school</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Facility Name *</Label>
                            <Input
                                id="name"
                                value={facilityName}
                                onChange={(e) => setFacilityName(e.target.value)}
                                placeholder="e.g., Swimming Pool, Science Lab, Library"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={createMutation.isPending} className="w-full">
                            {createMutation.isPending ? 'Adding...' : 'Add Facility'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
