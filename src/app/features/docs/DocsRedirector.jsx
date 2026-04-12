// app/features/docs/DocsRedirector.tsx  (Client Component)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DocsRedirector({ slug }) {
    const router = useRouter();

    useEffect(() => {
        if (slug) {
            router.replace(`/features/docs/${slug}`);
        }
    }, [slug, router]);

    if (!slug) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <p className="text-sm">No documentation found yet.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );
}