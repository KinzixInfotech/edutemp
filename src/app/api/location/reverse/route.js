// src/app/api/location/reverse/route.js

import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
        return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
    }

    try {
        // BigDataCloud — free, no API key, generous rate limits
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
            { next: { revalidate: 900 } }
        );

        if (!res.ok) throw new Error(`BigDataCloud error: ${res.status}`);

        const data = await res.json();

        // Normalize into the address shape extractSearchTerms() expects
        const adminLevels = data.localityInfo?.administrative || [];
        const getAdmin = (order) => adminLevels.find(a => a.order === order)?.name || "";

        const address = {
            city: data.city || "",
            town: data.locality || "",
            village: data.locality || "",
            city_district: data.locality || "",
            district: getAdmin(6),
            county: getAdmin(6),
            state_district: getAdmin(5),
            state: data.principalSubdivision || "",
            country: data.countryName || "",
        };

        if (process.env.NODE_ENV !== "production") {
            console.log("[reverse-geocode] raw:", data);
            console.log("[reverse-geocode] normalized:", address);
        }

        return NextResponse.json({ address });
    } catch (err) {
        console.error("[reverse-geocode] Error:", err);
        return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 });
    }
}