import FeeStatsWidget from "./FeeStatsWidget";
import AttendanceWidget from "./AttendanceWidget";
import RecentPaymentsWidget from "./RecentPaymentsWidget";
import NoticeBoardWidget from "./NoticeBoardWidget";
import QuickActionsWidget from "./QuickActionsWidget";
import CalendarWidget from "./CalendarWidget";
import { IndianRupee, CalendarCheck, Receipt, Bell, Zap, Calendar } from "lucide-react";

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
    CALENDAR: {
        id: 'CALENDAR',
        title: 'Calendar & Weather',
        description: 'Mini calendar with weather and events',
        component: CalendarWidget,
        icon: Calendar,
        defaultSize: 'col-span-1'
    },
    RECENT_PAYMENTS: {
        id: 'RECENT_PAYMENTS',
        title: 'Recent Payments',
        description: 'List of latest fee transactions',
        component: RecentPaymentsWidget,
        icon: Receipt,
        defaultSize: 'col-span-1 md:col-span-2'
    },
    NOTICE_BOARD: {
        id: 'NOTICE_BOARD',
        title: 'Notice Board',
        description: 'Recent announcements and notices',
        component: NoticeBoardWidget,
        icon: Bell,
        defaultSize: 'col-span-1 md:col-span-2'
    },
    QUICK_ACTIONS: {
        id: 'QUICK_ACTIONS',
        title: 'Quick Actions',
        description: 'Shortcuts to common tasks',
        component: QuickActionsWidget,
        icon: Zap,
        defaultSize: 'col-span-1'
    }
};

export const DEFAULT_WIDGETS = ['STATS_OVERVIEW', 'CALENDAR', 'QUICK_ACTIONS', 'ATTENDANCE', 'FEE_STATS', 'NOTICE_BOARD', 'RECENT_PAYMENTS'];
