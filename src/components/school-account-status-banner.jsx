'use client';

import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SchoolAccountStatusBanner() {
    const { fullUser } = useAuth();

    const school = fullUser?.school;
    const status = school?.status;

    if (!school || !status || status === 'ACTIVE' || fullUser?.role?.name === 'SUPER_ADMIN') {
        return null;
    }

    const isSoftFrozen = status === 'PAST_DUE';
    const isHardFrozen = status === 'SUSPENDED';
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

    return (
        <Card className={`mx-4 mt-4 border ${isSoftFrozen ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/10' : 'border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/10'}`}>
            <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                    {isSoftFrozen ? (
                        <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
                    ) : (
                        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{title}</p>
                            {school.freezeType && (
                                <Badge variant="outline" className="text-xs">
                                    {school.freezeType}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{description}</p>
                        {school.freezeReason && (
                            <p className="text-sm">
                                <span className="font-medium">Reason:</span> {school.freezeReason}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            View access remains available where permitted so staff can review records and communicate clearly with families.
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
