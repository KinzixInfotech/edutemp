// app/admissions/[slug]/page.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SubmitApplication from "../submitApplication/page";

async function fetchFormBySlug(slug, schoolId) {
    const response = await fetch(`/api/schools/admissions/forms?schoolId=${schoolId}&slug=${slug}`);
    if (!response.ok) throw new Error("Form not found");
    const data = await response.json();
    if (!data.forms || data.forms.length === 0) throw new Error("Form not found");
    return data.forms[0];
}

export default function FormPage({ params }) {
    const { slug } = params;
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const { data: form, isLoading, error } = useQuery({
        queryKey: ["form", slug, schoolId],
        queryFn: () => fetchFormBySlug(slug, schoolId),
        enabled: !!schoolId && !!slug,
    });

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

    if (error || !form) {
        return <div className="p-6 text-center text-red-500">Error: {error?.message || "Form not found"}</div>;
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{form.name}</h2>
            <SubmitApplication formId={form.id} />
            
        </div>
    );
}