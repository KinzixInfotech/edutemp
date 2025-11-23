'use client';
import { UserPlus, IndianRupee, FileText, Users, PlusCircle } from "lucide-react";
import WidgetContainer from "./WidgetContainer";
import Link from 'next/link';

export default function QuickActionsWidget({ onRemove }) {
    const actions = [
        {
            label: "Add Student",
            icon: UserPlus,
            href: "/dashboard/schools/students/add",
            color: "text-blue-600",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            label: "Collect Fee",
            icon: IndianRupee,
            href: "/dashboard/schools/fee/collect",
            color: "text-green-600",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        },
        {
            label: "Add Staff",
            icon: Users,
            href: "/dashboard/schools/staffs/add",
            color: "text-purple-600",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            label: "Create Notice",
            icon: FileText,
            href: "/dashboard/schools/noticeboard",
            color: "text-orange-600",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20"
        },
    ];

    return (
        <WidgetContainer title="Quick Actions" onRemove={onRemove} className="col-span-1 h-full">
            <div className="grid grid-cols-2 gap-3 h-full">
                {actions.map((action, index) => (
                    <Link
                        key={index}
                        href={action.href}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border ${action.border} ${action.bg} hover:scale-[1.02] transition-all duration-300 group cursor-pointer h-full`}
                    >
                        <div className={`p-2 rounded-full bg-background/60 mb-2 group-hover:bg-background/80 transition-colors`}>
                            <action.icon className={`h-5 w-5 ${action.color}`} />
                        </div>
                        <span className="text-xs font-medium text-foreground/80 text-center">{action.label}</span>
                    </Link>
                ))}
            </div>
        </WidgetContainer>
    );
}
