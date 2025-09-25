// components/admissions/SubmitApplication.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UploadButton } from "@uploadthing/react";

async function fetchForm({ formId, schoolId }) {
    const response = await fetch(`/api/schools/admissions/forms?schoolId=${schoolId}&id=${formId}`);
    if (!response.ok) throw new Error("Failed to fetch form");
    return response.json();
}

async function submitApplication(data) {
    const response = await fetch("/api/schools/admissions/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to submit application");
    return response.json();
}

export default function SubmitApplication({ formId }) {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId || new URLSearchParams(window.location.search).get("schoolId");
    const createdById = fullUser?.id;
    const [formData, setFormData] = useState({ name: "", email: "" });
    const [documents, setDocuments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const { data: { forms = [] } = {}, isLoading } = useQuery({
        queryKey: ["form", formId, schoolId],
        queryFn: () => fetchForm({ formId, schoolId }),
        enabled: !!schoolId && !!formId,
    });

    const mutation = useMutation({
        mutationFn: submitApplication,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            setSaving(false);
            toast.success("Application submitted successfully");
            setFormData({ name: "", email: "" });
            setDocuments([]);
        },
        onError: (err) => {
            setSaving(false);
            toast.error(err.message);
        },
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, val) => {
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.email) {
            setFormError("Name and email are required");
            return;
        }
        const form = forms[0];
        if (!form) {
            setFormError("Form not found");
            return;
        }
        mutation.mutate({
            admissionFormId: formId,
            schoolId,
            applicantName: formData.name,
            applicantEmail: formData.email,
            createdById: createdById || null, // Optional for public submission
            data: formData,
            documents,
        });
    };

    if (!schoolId) {
        return <div className="p-6 text-center">Please provide a valid school ID.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-6">
                <Loader2 className="animate-spin" size={30} />
            </div>
        );
    }

    const form = forms[0];
    if (!form) {
        return <div className="p-6 text-center text-red-500">Form not found</div>;
    }

    return (
        <div className="p-6">
            {/* <h2 className="text-2xl font-bold mb-4">{form.name}</h2> */}
            {/* {form.description && <p className="text-muted-foreground mb-4">{form.description}</p>} */}
            <div className="space-y-4">
                {/* <div>
                    <Label htmlFor="name" className="mb-2 text-muted-foreground">Name*</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="email" className="mb-2 text-muted-foreground">Email*</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                </div> */}
                {form.fields.map((field, index) => (
                    <div key={field.id}>
                        <Label className="mb-2 text-muted-foreground">
                            {field.name}
                            {field.required ? "*" : ""}
                        </Label>
                        {field.type === "file" ? (
                            <div>
                                <UploadButton
                                    endpoint="imageUploader"
                                    onClientUploadComplete={(res) => {
                                        setDocuments([
                                            ...documents,
                                            ...res.map((r) => ({
                                                fileUrl: r.url,
                                                fileName: r.name,
                                                mimeType: r.type,
                                                size: r.size,
                                            })),
                                        ]);
                                        toast.success("File uploaded");
                                    }}
                                    onUploadError={(err) => toast.error(err.message)}
                                />
                            </div>
                        ) : field.type === "select" ? (
                            <Select onValueChange={(val) => handleSelectChange(field.name, val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${field.name}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options?.map((opt, idx) => (
                                        <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                name={field.name}
                                onChange={handleChange}
                                type={field.type}
                                required={field.required}
                            />
                        )}
                    </div>
                ))}
                {formError && <p className="text-red-500">{formError}</p>}
                <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`w-full ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {saving ? (
                        <div className="flex items-center gap-2 justify-center">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Submitting</span>
                        </div>
                    ) : (
                        "Submit Application"
                    )}
                </Button>
            </div>
        </div>
    );
}