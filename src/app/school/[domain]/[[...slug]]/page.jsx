import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";

export default async function SchoolWebsitePage({ params }) {
    const { domain, slug } = params;
    const pageSlug = slug ? `/${slug.join('/')}` : '/';

    const school = await prisma.school.findUnique({
        where: { domain },
        include: {
            Notice: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                where: { status: 'PUBLISHED' } // Assuming status field exists, otherwise remove
            },
            galleries: {
                orderBy: { id: 'desc' },
                take: 20
            }
        }
    });

    if (!school || !school.websiteConfig) {
        return notFound();
    }

    // Parse config if it's a string (though Prisma usually handles Json)
    const config = typeof school.websiteConfig === 'string'
        ? JSON.parse(school.websiteConfig)
        : school.websiteConfig;

    // Find active page
    // Handle legacy config (single page)
    let activePage;
    if (config.pages) {
        activePage = config.pages.find(p => p.slug === pageSlug);
    } else {
        // Legacy support: if no pages array, treat root as the only page
        if (pageSlug === '/') {
            activePage = { sections: config.sections || [] };
        }
    }

    if (!activePage) {
        return notFound();
    }

    return (
        <WebsiteRenderer
            config={config}
            school={school}
            activePage={activePage}
            notices={school.Notice}
            gallery={school.galleries}
        />
    );
}
