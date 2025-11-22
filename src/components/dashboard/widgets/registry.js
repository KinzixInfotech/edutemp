import FeeStatsWidget from "./FeeStatsWidget";
import AttendanceWidget from "./AttendanceWidget";
import RecentPaymentsWidget from "./RecentPaymentsWidget";
import { IndianRupee, CalendarCheck, Receipt } from "lucide-react";

export const WIDGETS = {
    FEE_STATS: {
        id: 'FEE_STATS',
        title: 'Fee Collection',
        description: 'Overview of expected vs collected fees',
        component: FeeStatsWidget,
        icon: IndianRupee,
        defaultSize: 'col-span-1'
    },
    ATTENDANCE: {
        id: 'ATTENDANCE',
        title: 'Attendance',
        description: 'Daily attendance summary for students & staff',
        component: AttendanceWidget,
        icon: CalendarCheck,
        defaultSize: 'col-span-1'
    },
    RECENT_PAYMENTS: {
        id: 'RECENT_PAYMENTS',
        title: 'Recent Payments',
        description: 'List of latest fee transactions',
        component: RecentPaymentsWidget,
        icon: Receipt,
        defaultSize: 'col-span-1 md:col-span-2'
    }
};

export const DEFAULT_WIDGETS = ['FEE_STATS', 'ATTENDANCE', 'RECENT_PAYMENTS'];
