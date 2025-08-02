"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CropImageDialog from "@/app/components/CropImageDialog";
import { uploadFiles } from "@/app/components/utils/uploadThing";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    profilePicture: z.string().optional(),
});

export default function CreateSuperadminPage() {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [form, setForm] = useState({ name: "", email: "", password: "", profilePicture: "" });
    const [users, setUsers] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [rawImage, setRawImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const router = useRouter();
    const [errorUpload, setErrorupload] = useState(false);
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const res = await fetch("/api/superadmin");
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setRawImage(reader.result);
            setCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const parsed = schema.safeParse({ ...form, password });

            if (!parsed.success) {
                console.error("Validation Errors:", parsed.error.format());
                toast.error("Please fix form errors");
                return;
            }

            const res = await fetch("/api/superadmin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, password }),
            });

            if (res.ok) {
                toast.success("SuperAdmin Created!");
                setForm({ name: "", email: "", password: "", profilePicture: "" });
                setPassword("");
                setPreviewUrl("");
                fetchUsers();
            } else {
                toast.error("Error Creating SuperAdmin");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            toast.error("Something went wrong while creating superadmin.");
        } finally {
            setLoading(false);
        }
    };

    const retryUpload = async () => {
        const res = await uploadFiles("profilePictureUploader", {
            files: [tempImage],
            input: {
                profileId: crypto.randomUUID(),
                username: form.name || "User",
            },
        });
        if (res && res[0]?.url) {
            setForm({ ...form, profilePicture: res[0].url });
            setPreviewUrl(res[0].url);
            toast.success("Image uploaded!");
            setErrorupload(true);
        } else {
            toast.error("Upload failed");
        }
    }


    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Crop Dialog */}
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => {
                        if (!uploading) setCropDialogOpen(false); // disable closing while uploading
                    }}
                    uploading={uploading}

                    open={cropDialogOpen}
                    // onClose={() => setCropDialogOpen(false)}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date();
                        const iso = now.toISOString().replace(/[:.]/g, "-");
                        const perf = Math.floor(performance.now() * 1000); // microseconds (approximate nanos)
                        const timestamp = `${iso}-${perf}`;
                        const filename = `${timestamp}.jpg`;
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" });
                        setTempImage(file);
                        try {
                            setUploading(true)

                            const res = await uploadFiles("profilePictureUploader", {
                                files: [file],
                                input: {
                                    profileId: crypto.randomUUID(),
                                    username: form.name || "User",
                                },
                            });
                            if (res && res[0]?.url) {
                                setForm({ ...form, profilePicture: res[0].url });
                                setPreviewUrl(res[0].url);
                                toast.success("Image uploaded!")
                                setErrorupload(false);
                            } else {
                                toast.error("Upload failed");
                                setErrorupload(true);
                            }
                        } catch (err) {
                            toast.error("Something went wrong during upload");
                            console.error(err);
                            setErrorupload(true);
                        } finally {
                            setUploading(false)
                            setCropDialogOpen(false);
                        }

                    }}
                />
            )}
            {/* SuperAdmin Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Create Superadmin</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                            <div onClick={() => setShowPassword(!showPassword)} className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 p-1">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Profile Picture</Label>
                        <Input type="file" accept="image/*" onChange={handleImageUpload} />
                        {previewUrl && <Image src={previewUrl} width={80} height={80} alt="Preview" className="rounded-full mt-2" />}
                        {errorUpload && <div onClick={() => retryUpload()} ><Button >Retry</Button></div>}
                    </div>
                    <div className="col-span-full flex justify-center">
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    Creating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create SuperAdmin
                                    <Plus />
                                </span>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* User List */}
            <Card>
                <CardHeader>
                    <CardTitle>Existing Superadmins</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Profile</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name || "-"}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        {/* {user.profilePicture ? (
                                            <Image
                                                src={user.profilePicture || "/default.png"}
                                                alt="Profile"
                                                width={32}
                                                height={32}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            "-"
                                        )} */}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">View</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>User Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-2">
                                                    <p><strong>Name:</strong> {user.name}</p>
                                                    <p><strong>Email:</strong> {user.email}</p>
                                                    {user.profilePicture && (
                                                        <Image src={user.profilePicture} alt="Profile" width={100} height={100} className="rounded-md" />
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
}
