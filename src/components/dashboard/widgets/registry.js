import RecentPaymentsWidget from "./RecentPaymentsWidget";
import CalendarWidget from "./CalendarWidget";
import { Receipt, Calendar } from "lucide-react";

export const WIDGETS = {
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
};

export const DEFAULT_WIDGETS = ['CALENDAR', 'RECENT_PAYMENTS'];