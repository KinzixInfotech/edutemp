"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Key, Eye, EyeOff, Users, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function RoleManagementPage() {
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    console.log(fullUser);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [formData, setFormData] = useState({
        role: "LIBRARIAN",
        name: "",
        email: "",
        password: "",
    });

    // Fetch librarians
    const { data: librarians = [], isLoading: loadingLibrarians } = useQuery({
        queryKey: ["librarians"],
        queryFn: async () => {
            const res = await fetch("/api/admin/roles/librarians");
            if (!res.ok) throw new Error("Failed to fetch librarians");
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch accountants
    const { data: accountants = [], isLoading: loadingAccountants } = useQuery({
        queryKey: ["accountants"],
        queryFn: async () => {
            const res = await fetch("/api/admin/roles/accountants");
            if (!res.ok) throw new Error("Failed to fetch accountants");
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch("/api/admin/roles/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    schoolId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create user");
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast.success(`${formData.role} created successfully!`);
            setGeneratedCredentials(data.credentials);

            if (formData.role === "LIBRARIAN") {
                queryClient.invalidateQueries(["librarians"]);
            } else {
                queryClient.invalidateQueries(["accountants"]);
            }

            setFormData({
                role: "LIBRARIAN",
                name: "",
                email: "",
                password: "",
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const response = await fetch(`/api/admin/roles/${userId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete user");
            }

            return response.json();
        },
        onSuccess: (_, variables) => {
            toast.success("User deleted successfully");
            if (variables.role === "LIBRARIAN") {
                queryClient.invalidateQueries(["librarians"]);
            } else {
                queryClient.invalidateQueries(["accountants"]);
            }
            setShowDeleteDialog(false);
            setSelectedUser(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch(`/api/admin/roles/${selectedUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update user");
            }

            return response.json();
        },
        onSuccess: (_, variables) => {
            toast.success("User updated successfully");
            if (variables.role === "LIBRARIAN") {
                queryClient.invalidateQueries(["librarians"]);
            } else {
                queryClient.invalidateQueries(["accountants"]);
            }
            setShowEditDialog(false);
            setSelectedUser(null);
            setFormData({ role: "LIBRARIAN", name: "", email: "", password: "" });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleCreateUser = () => {
        createUserMutation.mutate(formData);
    };

    const handleUpdateUser = () => {
        updateUserMutation.mutate({
            ...formData,
            role: selectedUser.role,
        });
    };

    const handleDeleteUser = () => {
        if (selectedUser) {
            deleteUserMutation.mutate({
                userId: selectedUser.id,
                role: selectedUser.role,
            });
        }
    };

    const openEditDialog = (user, role) => {
        setSelectedUser({ ...user, role });
        setFormData({
            role,
            name: user.name,
            email: user.email,
            password: "",
        });
        setShowEditDialog(true);
    };

    const openDeleteDialog = (user, role) => {
        setSelectedUser({ ...user, role });
        setShowDeleteDialog(true);
    };

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>Role Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {librarians.length} librarian{librarians.length !== 1 ? 's' : ''}, {accountants.length} accountant{accountants.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Librarians Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Librarians</CardTitle>
                    <Button
                        onClick={() => {
                            setFormData({ role: "LIBRARIAN", name: "", email: "", password: "" });
                            setShowCreateDialog(true);
                        }}
                        size="sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Librarian
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingLibrarians ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        </div>
                    ) : librarians.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                            <h3 className="text-lg font-semibold mb-2">No librarians yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add your first librarian to get started
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>School</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {librarians.map((librarian) => (
                                        <TableRow key={librarian.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{librarian.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{librarian.email}</TableCell>
                                            <TableCell className="text-sm">{librarian.school?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={librarian.status === "ACTIVE" ? "default" : "secondary"}>
                                                    {librarian.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(librarian, "LIBRARIAN")}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(librarian, "LIBRARIAN")}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Accountants Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Accountants</CardTitle>
                    <Button
                        onClick={() => {
                            setFormData({ role: "ACCOUNTANT", name: "", email: "", password: "" });
                            setShowCreateDialog(true);
                        }}
                        size="sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Accountant
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingAccountants ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        </div>
                    ) : accountants.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                            <h3 className="text-lg font-semibold mb-2">No accountants yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add your first accountant to get started
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>School</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountants.map((accountant) => (
                                        <TableRow key={accountant.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{accountant.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{accountant.email}</TableCell>
                                            <TableCell className="text-sm">{accountant.school?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={accountant.status === "ACTIVE" ? "default" : "secondary"}>
                                                    {accountant.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(accountant, "ACCOUNTANT")}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(accountant, "ACCOUNTANT")}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Create {formData.role === "LIBRARIAN" ? "Librarian" : "Accountant"}
                        </DialogTitle>
                        <DialogDescription>
                            Add a new {formData.role.toLowerCase()} to your school
                        </DialogDescription>
                    </DialogHeader>

                    {generatedCredentials ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                    <Key className="h-5 w-5" />
                                    <h3 className="font-semibold">User Created Successfully!</h3>
                                </div>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Share these credentials with the user:
                                </p>
                                <div className="space-y-2 bg-white dark:bg-gray-900 p-3 rounded">
                                    <div>
                                        <Label className="text-xs">Email</Label>
                                        <p className="font-mono text-sm">{generatedCredentials.email}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Password</Label>
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono text-sm flex-1">
                                                {showCredentialsPassword ? generatedCredentials.password : "••••••••••••"}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowCredentialsPassword(!showCredentialsPassword)}
                                            >
                                                {showCredentialsPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    {generatedCredentials.autoGenerated && (
                                        <p className="text-xs text-muted-foreground">
                                            Password was auto-generated
                                        </p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={() => {
                                        setGeneratedCredentials(null);
                                        setShowCreateDialog(false);
                                        setShowCredentialsPassword(false);
                                    }}
                                >
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    className="bg-muted text-sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="bg-muted text-sm"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password (optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        className="bg-muted text-sm pr-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Leave empty to auto-generate"
                                    />
                                    {formData.password && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    If left empty, a secure password will be generated automatically
                                </p>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateUser}
                                    disabled={createUserMutation.isPending}
                                >
                                    {createUserMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create User"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit {selectedUser?.role === "LIBRARIAN" ? "Librarian" : "Accountant"}
                        </DialogTitle>
                        <DialogDescription>
                            Update user information
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                className="bg-muted text-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                className="bg-muted text-sm"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="user@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New Password (optional)</Label>
                            <div className="relative">
                                <Input
                                    id="edit-password"
                                    type={showPassword ? "text" : "password"}
                                    className="bg-muted text-sm pr-10"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Leave empty to keep current password"
                                />
                                {formData.password && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Leave empty to keep the current password
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setShowEditDialog(false);
                                setFormData({ role: "LIBRARIAN", name: "", email: "", password: "" });
                                setSelectedUser(null);
                            }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateUser}
                                disabled={updateUserMutation.isPending}
                            >
                                {updateUserMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update User"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) from the system.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={deleteUserMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {deleteUserMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
