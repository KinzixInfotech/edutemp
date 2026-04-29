'use client'

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function SchoolAccountActionDialog({
    open,
    onOpenChange,
    schoolName,
    action,
    loading,
    onConfirm,
}) {
    const [reason, setReason] = useState('');
    const [confirmName, setConfirmName] = useState('');
    const [doubleConfirm, setDoubleConfirm] = useState(false);

    const config = useMemo(() => {
        if (action === 'freeze-soft') {
            return {
                title: 'Soft Freeze School',
                description: 'This moves the school to past-due mode. Read access stays available, but write operations are blocked.',
                confirmLabel: 'Apply Soft Freeze',
            };
        }

        if (action === 'freeze-hard') {
            return {
                title: 'Hard Freeze School',
                description: 'This suspends the school immediately and blocks access across protected APIs.',
                confirmLabel: 'Apply Hard Freeze',
            };
        }

        if (action === 'unfreeze') {
            return {
                title: 'Unfreeze School',
                description: 'This restores the school to active status and clears freeze metadata.',
                confirmLabel: 'Restore Access',
            };
        }

        return {
            title: 'Terminate School',
            description: 'This is irreversible after cleanup begins. The school will be marked terminated first, then cleanup will run in the background.',
            confirmLabel: 'Terminate School',
        };
    }, [action]);

    const requiresReason = action !== 'unfreeze';
    const requiresDoubleConfirm = action === 'terminate';
    const isValid = confirmName.trim() === schoolName && (!requiresReason || reason.trim().length >= 3) && (!requiresDoubleConfirm || doubleConfirm);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {(action === 'terminate' || action === 'freeze-hard') && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {config.title}
                    </DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="school-confirm-name">Type the school name to confirm</Label>
                        <Input
                            id="school-confirm-name"
                            value={confirmName}
                            onChange={(event) => setConfirmName(event.target.value)}
                            placeholder={schoolName}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="school-action-reason">Reason</Label>
                        <Textarea
                            id="school-action-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Document why this action is being taken"
                            rows={4}
                        />
                    </div>

                    {requiresDoubleConfirm && (
                        <label className="flex items-start gap-3 rounded-md border p-3">
                            <Checkbox
                                checked={doubleConfirm}
                                onCheckedChange={(checked) => setDoubleConfirm(checked === true)}
                            />
                            <span className="text-sm text-muted-foreground">
                                I understand that termination will queue irreversible cleanup work once the background job starts.
                            </span>
                        </label>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant={action === 'terminate' ? 'destructive' : 'default'}
                        disabled={!isValid || loading}
                        onClick={() => onConfirm({ reason })}
                    >
                        {loading ? 'Working...' : config.confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
