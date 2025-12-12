"use client";

import { useEffect, useState } from "react";
import { Book, BookOpen, Clock, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function LibrarianDashboard() {
    const [stats, setStats] = useState({
        totalBooks: 0,
        issuedBooks: 0,
        pendingRequests: 0,
        overdueFines: 0,
    });

    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        // TODO: Fetch actual stats from API
        setStats({
            totalBooks: 1250,
            issuedBooks: 342,
            pendingRequests: 15,
            overdueFines: 8,
        });

        setRecentActivity([
            { id: 1, action: "Book issued", item: "Introduction to Computer Science", student: "John Doe", time: "10 minutes ago" },
            { id: 2, action: "Book returned", item: "Mathematics Grade 10", student: "Jane Smith", time: "1 hour ago" },
            { id: 3, action: "New request", item: "Physics Fundamentals", student: "Mike Johnson", time: "2 hours ago" },
        ]);
    }, []);

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Librarian Dashboard</h1>
                    <p className="text-muted-foreground">Manage your school library efficiently</p>
                </div>
                <Link href="/dashboard/schools/library/catalog">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Book
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Books"
                    value={stats.totalBooks}
                    icon={Book}
                    color="text-blue-600"
                />
                <StatCard
                    title="Issued Books"
                    value={stats.issuedBooks}
                    icon={BookOpen}
                    color="text-green-600"
                />
                <StatCard
                    title="Pending Requests"
                    value={stats.pendingRequests}
                    icon={Clock}
                    color="text-yellow-600"
                />
                <StatCard
                    title="Overdue Items"
                    value={stats.overdueFines}
                    icon={AlertCircle}
                    color="text-red-600"
                />
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href="/dashboard/schools/library/issue">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <BookOpen className="h-6 w-6" />
                            <span>Issue Book</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/schools/library/issue">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <ArrowRight className="h-6 w-6" />
                            <span>Return Book</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/schools/library/requests">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <Clock className="h-6 w-6" />
                            <span>View Requests</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/schools/library/fines">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <AlertCircle className="h-6 w-6" />
                            <span>Manage Fines</span>
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentActivity.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start justify-between border-b pb-4 last:border-0"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{activity.action}</Badge>
                                        <span className="font-medium">{activity.item}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Student: {activity.student}
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
