"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit2, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { Checkbox } from "@/components/ui/checkbox";

export default function TimeSlotManagementPage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timeSlots, setTimeSlots] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        label: "",
        startTime: "",
        endTime: "",
        isBreak: false,
    });

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchTimeSlots();
        }
    }, [fullUser?.schoolId]);

    const fetchTimeSlots = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/timetable/slots`);
            setTimeSlots(res.data);
        } catch (error) {
            console.error("Error fetching time slots:", error);
            toast.error("Failed to load time slots");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.label || !formData.startTime || !formData.endTime) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsAdding(true);
        try {
            await axios.post(`/api/schools/${fullUser.schoolId}/timetable/slots`, {
                ...formData,
                sequence: timeSlots.length + 1,
            });
            toast.success("Time slot added successfully");
            setFormData({ label: "", startTime: "", endTime: "", isBreak: false });
            fetchTimeSlots();
        } catch (error) {
            console.error("Error adding time slot:", error);
            toast.error(error.response?.data?.error || "Failed to add time slot");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (slotId) => {
        if (!confirm("Are you sure you want to delete this time slot?")) return;

        try {
            await axios.delete(`/api/schools/${fullUser.schoolId}/timetable/slots/${slotId}`);
            toast.success("Time slot deleted successfully");
            fetchTimeSlots();
        } catch (error) {
            console.error("Error deleting time slot:", error);
            toast.error(error.response?.data?.error || "Failed to delete time slot");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Time Slot Management</h1>
                    <p className="text-muted-foreground">
                        Configure periods and break times for your school timetable
                    </p>
                </div>
                <Link href="/dashboard/timetable/manage">
                    <Button variant="outline">
                        <Clock className="mr-2 h-4 w-4" />
                        View Timetables
                    </Button>
                </Link>
            </div>

            {/* Add New Time Slot */}
            <Card>
                <CardHeader>
                    <CardTitle>Add New Time Slot</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="label">Label *</Label>
                            <Input
                                id="label"
                                placeholder="e.g. Period 1"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time *</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime">End Time *</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <div className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                    id="isBreak"
                                    checked={formData.isBreak}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isBreak: checked })
                                    }
                                />
                                <Label htmlFor="isBreak" className="font-normal">
                                    Break
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button onClick={handleAdd} disabled={isAdding}>
                            {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add Time Slot
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Time Slots List */}
            <Card>
                <CardHeader>
                    <CardTitle>Configured Time Slots ({timeSlots.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {timeSlots.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No time slots configured. Add your first time slot above.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sequence</TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timeSlots.map((slot) => (
                                    <TableRow key={slot.id}>
                                        <TableCell>
                                            <Badge variant="outline">{slot.sequence}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{slot.label}</TableCell>
                                        <TableCell>
                                            {slot.startTime} - {slot.endTime}
                                        </TableCell>
                                        <TableCell>
                                            {slot.isBreak ? (
                                                <Badge variant="secondary">Break</Badge>
                                            ) : (
                                                <Badge>Period</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(slot.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
