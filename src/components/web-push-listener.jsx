"use client";

import { useWebPush, ALLOWED_ROLES } from "@/hooks/useWebPush";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function WebPushListener() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    const handleMessage = useCallback((payload) => {
        console.log("WebPushListener received message, invalidating queries...");
        // Invalidate queries to update badges
        queryClient.invalidateQueries({ queryKey: ['requests-counts'] });
        queryClient.invalidateQueries({ queryKey: ['library-requests-count'] });
        queryClient.invalidateQueries({ queryKey: ['bus-requests-count'] });

        // Also invalidate generic notifications if they exist
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notices'] });
        queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    }, [queryClient]);

    const { permission, requestForPermission } = useWebPush({
        onMessageReceived: handleMessage
    });

    const showPermissionBanner = permission === 'default' &&
        fullUser?.role?.name &&
        ALLOWED_ROLES.includes(fullUser.role.name.toUpperCase());

    if (!showPermissionBanner) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Enable Notifications:</span> Get important updates for your role instantly.
                </div>
            </div>
            <Button
                size="sm"
                onClick={requestForPermission}
                className="bg-blue-600 hover:bg-blue-700 text-white border-none h-8 px-4"
            >
                Allow
            </Button>
        </div>
    );
}
