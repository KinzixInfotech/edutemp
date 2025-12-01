"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

const LibraryNotificationContext = createContext();

export function LibraryNotificationProvider({ children }) {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [unseenRequestsCount, setUnseenRequestsCount] = useState(0);
    const [lastVisitTime, setLastVisitTime] = useState(null);

    // Load last visit time once on mount
    useEffect(() => {
        if (schoolId) {
            const stored = localStorage.getItem(`library_requests_last_visit_${schoolId}`);
            if (stored) {
                setLastVisitTime(new Date(stored));
            }
        }
    }, [schoolId]);

    const fetchUnseenCount = useCallback(async () => {
        if (!schoolId) return;

        try {
            const res = await axios.get(
                `/api/schools/${schoolId}/library/requests`
            );

            // Filter requests that are PENDING and created after last visit
            const unseenCount = res.data.filter((request) => {
                if (request.status !== "PENDING") return false;
                if (!lastVisitTime) return true; // If never visited, all are unseen
                return new Date(request.requestDate) > lastVisitTime;
            }).length;

            setUnseenRequestsCount(unseenCount);
        } catch (error) {
            console.error("Failed to fetch unseen requests count:", error);
        }
    }, [schoolId, lastVisitTime]);

    // Fetch unseen count when schoolId or lastVisitTime changes
    useEffect(() => {
        if (schoolId) {
            fetchUnseenCount();
            // Refresh every 30 seconds
            const interval = setInterval(fetchUnseenCount, 30000);
            return () => clearInterval(interval);
        }
    }, [schoolId, fetchUnseenCount]);

    const markRequestsAsSeen = useCallback(() => {
        if (!schoolId) return;

        const now = new Date();
        localStorage.setItem(`library_requests_last_visit_${schoolId}`, now.toISOString());
        setLastVisitTime(now);
        setUnseenRequestsCount(0);
    }, [schoolId]);

    return (
        <LibraryNotificationContext.Provider
            value={{
                unseenRequestsCount,
                markRequestsAsSeen,
                refreshCount: fetchUnseenCount,
            }}
        >
            {children}
        </LibraryNotificationContext.Provider>
    );
}

export function useLibraryNotifications() {
    const context = useContext(LibraryNotificationContext);
    if (!context) {
        throw new Error(
            "useLibraryNotifications must be used within LibraryNotificationProvider"
        );
    }
    return context;
}
