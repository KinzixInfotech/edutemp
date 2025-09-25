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
    const schoolId = fullUser?.schoolId;
    const createdById = fullUser?.id;

    // formData will store values keyed by field id
    const [formData, setFormData] = useState({});
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
            setFormData({});
            setDocuments([]);
        },
        onError: (err) => {
            setSaving(false);
            toast.error(err.message);
        },
    });

    const handleChange = (fieldId, value) => {
        setFormData({ ...formData, [fieldId]: value });
    };

    const handleSubmit = () => {
        // Basic required check
        // if (!formData.name || !formData.email) {
        //     setFormError("Name and email are required");
        //     return;
        // }

        const form = forms[0];
        if (!form) {
            setFormError("Form not found");
            return;
        }

        // Collect dynamic field values
        const dynamicData = {};
        form.fields.forEach((field) => {
            if (formData[field.id] !== undefined && formData[field.id] !== "") {
                dynamicData[field.id] = formData[field.id];
            }
        });

        // Prepare documents
        const preparedDocs = documents.map((doc) => ({
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            size: doc.size,
            fieldId: doc.fieldId || null, // optional association with a field
        }));

        mutation.mutate({
            admissionFormId: formId,
            schoolId,
            applicantName: formData.name,
            applicantEmail: formData.email,
            createdById: createdById || null,
            data: dynamicData,
            documents: preparedDocs,
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
        <div className="p-6 space-y-4">

            <div> <Label htmlFor="name" className="mb-2 text-muted-foreground">Name*</Label>

                <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                />

            </div>
            <div>
                <Label htmlFor="email" className="mb-2 text-muted-foreground">Email*</Label>

                <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                />
            </div>
            {form.fields.map((field) => (
                <div key={field.id}>
                    <Label className="mb-2 text-muted-foreground">
                        {field.name}{field.required ? "*" : ""}
                    </Label>

                    {field.type === "file" ? (
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
                                        fieldId: field.id, // store which field uploaded
                                    })),
                                ]);
                                toast.success("File uploaded");
                            }}
                            onUploadError={(err) => toast.error(err.message)}
                        />
                    ) : field.type === "select" ? (
                        <Select onValueChange={(val) => handleChange(field.id, val)}>
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
                            id={field.id}
                            name={field.name}
                            type={field.type}
                            required={field.required}
                            value={formData[field.id] || ""}
                            onChange={(e) => handleChange(field.id, e.target.value)}
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
    );
}
