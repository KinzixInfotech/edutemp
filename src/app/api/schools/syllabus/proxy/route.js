// app/api/schools/syllabus/proxy/route.ts
import { NextResponse } from "next/server";

export async function GET(req) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch PDF");

        const arrayBuffer = await res.arrayBuffer();
        return new Response(arrayBuffer, {
            headers: {
                "Content-Type": "application/pdf",
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
    }
}
