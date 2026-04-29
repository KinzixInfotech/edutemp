// /app/api/check-domain/route.js
import  prisma  from "@/lib/prisma"
import { NextResponse } from "next/server"
import { buildLegacyTenantDomain, buildTenantDomain, normalizeTenantName } from "@/lib/school-domain"

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const subdomain = normalizeTenantName(searchParams.get("subdomain"))
    const domain = buildTenantDomain(subdomain)
    const legacyDomain = buildLegacyTenantDomain(subdomain)

    if (!subdomain) return NextResponse.json({ exists: false })

    const exists = await prisma.school.findFirst({
        where: {
            OR: [
                {
                    domain: {
                        equals: domain,
                        mode: "insensitive",
                    },
                },
                {
                    domain: {
                        equals: legacyDomain,
                        mode: "insensitive",
                    },
                },
            ],
        },
        select: { id: true },
    })

    return NextResponse.json({ exists: !!exists })
}
