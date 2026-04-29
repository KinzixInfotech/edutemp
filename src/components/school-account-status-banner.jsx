'use client';

import Link from 'next/link';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export function SchoolAccountStatusBanner() {
    const { fullUser } = useAuth();

    const school = fullUser?.school;
    const status = school?.status;

    if (!school || !status || status === 'ACTIVE' || fullUser?.role?.name === 'SUPER_ADMIN') {
        return null;
    }

    const isSoftFrozen = status === 'PAST_DUE';
    const isHardFrozen = status === 'SUSPENDED';
    const isTerminated = status === 'TERMINATED';
    const title = isSoftFrozen
        ? 'Read-only mode is active for this school'
        : isHardFrozen
            ? 'This school account is suspended'
            : 'This school account is terminated';
    const description = isSoftFrozen
        ? 'Create, edit, and delete actions are blocked for school staff until renewal. Parents can still make fee payments to restore service.'
        : isHardFrozen
            ? 'Operational access is blocked for this school until the account is restored.'
            : 'This school account is no longer active.';
    const reason = school.freezeReason || (
        isSoftFrozen
            ? 'Subscription expired or billing is overdue.'
            : isHardFrozen
                ? 'Subscription is suspended and renewal is required.'
                : 'This school account has been terminated.'
    );
    const learnMoreTitle = isSoftFrozen
        ? 'Editing is disabled while the account is soft frozen'
        : isHardFrozen
            ? 'This hard freeze blocks normal module access'
            : 'This account has been terminated';
    const learnMoreDescription = isSoftFrozen
        ? 'You cannot add, edit, or delete records in any module while this school remains in soft freeze. Existing information stays visible where read access is still allowed, and renewal will restore normal editing.'
        : isHardFrozen
            ? 'This hard freeze blocks write access across modules and can stop normal operational access until the subscription issue is resolved. Renewing the account is required before regular work can continue.'
            : 'This account is no longer active. Editing and delete actions remain disabled, and renewal or manual restoration is required before normal access can be considered.';
    const accentClasses = isSoftFrozen
        ? 'border-amber-200 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/20'
        : isTerminated
            ? 'border-zinc-300 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/40'
            : 'border-red-200 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/20';
    const iconClasses = isSoftFrozen ? 'text-amber-600' : isTerminated ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-600';

    return (
        <Card className={`mx-4 mt-4 border shadow-sm ${accentClasses}`}>
            <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                    {isSoftFrozen ? (
                        <Lock className={`w-5 h-5 mt-0.5 ${iconClasses}`} />
                    ) : (
                        <ShieldAlert className={`w-5 h-5 mt-0.5 ${iconClasses}`} />
                    )}
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold">{title}</p>
                                    {school.freezeType && (
                                        <Badge variant="outline" className="text-xs bg-background/70">
                                            {school.freezeType}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{description}</p>
                                <p className="text-sm">
                                    <span className="font-medium">Reason:</span> {reason}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    {isSoftFrozen ? 'Editing disabled' : isHardFrozen ? 'Restricted access' : 'Renewal required'}
                                </Badge>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            Learn more
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-xl">
                                        <DialogHeader>
                                            <DialogTitle>{learnMoreTitle}</DialogTitle>
                                            <DialogDescription>{learnMoreDescription}</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-3 text-sm text-muted-foreground">
                                            <p>
                                                You cannot add, edit, or delete data in modules like notices, students, staff, fees, transport, exams, inventory, and other school workflows while this restriction is active.
                                            </p>
                                            <p>
                                                <span className="font-medium text-foreground">Reason:</span> {reason}
                                            </p>
                                            <p>
                                                Renew the subscription to restore normal editing and delete access.
                                            </p>
                                        </div>
                                        <DialogFooter>
                                            <Button asChild>
                                                <Link href="/contact">Renew</Link>
                                            </Button>
                                            <DialogClose asChild>
                                                <Button variant="outline">Okay</Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Renew to restore normal access. Until then, only the actions still permitted by the current freeze state will remain available.
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
