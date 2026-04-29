// app/login/page.js
import { Suspense } from "react";
import { headers } from "next/headers";
import LoginPhoto from "./LoginPh";
import { Loader2 } from "lucide-react";
import { getSchoolTenantByHost, getSchoolTenantMetadata } from "@/lib/school-tenant-server";
import { isSchoolTenantHost } from "@/lib/tenant-host";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    const school = await getSchoolTenantByHost(host);

    if (!school) {
        return {
            title: 'School Login | EduBreezy',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const meta = getSchoolTenantMetadata(school, host);
    const generatedImageUrl = `${meta.origin}/api/og/school-login?name=${encodeURIComponent(meta.schoolName)}&code=${encodeURIComponent(meta.schoolCode)}`;
    const imageUrl = school?.publicProfile?.coverImage || school?.profilePicture || generatedImageUrl;

    return {
        title: meta.title,
        description: meta.description,
        keywords: [
            `${meta.schoolName} login`,
            `${meta.schoolName} ERP`,
            `${meta.schoolName} school portal`,
            `${meta.schoolCode} login`,
            'EduBreezy school login',
        ],
        alternates: {
            canonical: meta.loginUrl,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        openGraph: {
            type: 'website',
            url: meta.loginUrl,
            siteName: 'EduBreezy',
            title: meta.title,
            description: meta.description,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: `${meta.schoolName} login portal`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.title,
            description: meta.description,
            images: [imageUrl],
        },
    };
}

export default async function LoginPage() {
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    const school = await getSchoolTenantByHost(host);
    const tenantHostDetected = isSchoolTenantHost(host);

    return (
        <Suspense fallback={<div className="flex items-center justify-center w-full h-full flex-col gap-4">
            <Loader2 size={30} color="black" />
            Loading...</div>}>
            <LoginPhoto initialSchool={school} tenantHostDetected={tenantHostDetected} />
        </Suspense>
    );
}
