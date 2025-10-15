"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export default function NetworkStatusDialog() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return (
        <Dialog open={isOffline} onOpenChange={() => { }}>
            <DialogContent  showCloseButton={false} className=" flex items-center justify-center bg-red-100 border-red-300 dark:border-red-950 border-2 dark:bg-red-900 hover:cursor-not-allowed">
                <div className="text-center">
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-bold text-red-600 dark:text-red-400">
                            No Internet Connection 
                        </DialogTitle>
                        <DialogDescription className="mt-4 text-lg text-red-700 dark:text-red-300">
                            Please check your network connection. This popup will disappear
                            automatically once your internet is back.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6">
                        <div className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-xs shadow-lg animate-pulse">
                            Waiting for connection...
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
