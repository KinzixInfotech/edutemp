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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Armchair } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function HallManagementPage() {
    const { fullUser } = useAuth();
    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        roomNumber: "",
        capacity: "",
    });

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchHalls();
        }
    }, [fullUser?.schoolId]);

    const fetchHalls = async () => {
        try {
            const res = await axios.get(
                `/api/schools/${fullUser.schoolId}/examination/halls`
            );
            setHalls(res.data);
        } catch (error) {
            console.error("Error fetching halls:", error);
            toast.error("Failed to fetch halls");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.capacity) {
            toast.error("Name and Capacity are required");
            return;
        }

        try {
            await axios.post(
                `/api/schools/${fullUser.schoolId}/examination/halls`,
                formData
            );
            toast.success("Hall created successfully");
            setIsDialogOpen(false);
            setFormData({ name: "", roomNumber: "", capacity: "" });
            fetchHalls();
        } catch (error) {
            console.error("Error creating hall:", error);
            toast.error("Failed to create hall");
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Exam Halls</h1>
                    <p className="text-muted-foreground">
                        Manage examination halls and seating capacity.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add New Hall
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Exam Hall</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Hall Name</Label>
                                <Input
                                    className="col-span-3"
                                    placeholder="e.g. Main Auditorium"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Room No</Label>
                                <Input
                                    className="col-span-3"
                                    placeholder="e.g. A-101"
                                    value={formData.roomNumber}
                                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Capacity</Label>
                                <Input
                                    type="number"
                                    className="col-span-3"
                                    placeholder="e.g. 50"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit}>Create Hall</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hall Name</TableHead>
                                <TableHead>Room Number</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {halls.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No halls found. Add a hall to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                halls.map((hall) => (
                                    <TableRow key={hall.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Armchair className="h-4 w-4 text-muted-foreground" />
                                                {hall.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{hall.roomNumber || "-"}</TableCell>
                                        <TableCell>{hall.capacity} Seats</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
