import { withSchoolAccess } from "@/lib/api-auth"; // import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { remember, generateKey } from "@/lib/cache";

// const SEARCH_TTL = 600; // 10 minutes

// export async function GET(req) {
//     const { searchParams } = new URL(req.url);
//     const query = searchParams.get("q");

//     if (!query || query.trim().length < 2) {
//         return NextResponse.json({ schools: [] });
//     }

//     try {
//         const normalized = query.trim().toLowerCase();
//         const cacheKey = generateKey("schools:search", normalized);

//         const schools = await remember(
//             cacheKey,
//             async () => {
//                 if (process.env.NODE_ENV !== "production") {
//                     console.log(`[schools/search] CACHE MISS – querying DB for "${query}"`);
//                 }

//                 return prisma.school.findMany({
//                     where: {
//                         OR: [
//                             { name: { contains: query, mode: "insensitive" } },
//                             { location: { contains: query, mode: "insensitive" } },
//                             { code: { contains: query, mode: "insensitive" } },
//                             { schoolCode: { contains: query, mode: "insensitive" } },
//                         ],
//                     },
//                     select: {
//                         id: true,
//                         name: true,
//                         schoolCode: true,
//                         location: true,
//                         profilePicture: true,
//                     },
//                     take: 20,
//                     orderBy: { name: "asc" },
//                 });
//             },
//             SEARCH_TTL
//         );

//         return NextResponse.json({ schools });
//     } catch (err) {
//         console.error("Error searching schools:", err);
//         return NextResponse.json({ error: "Failed to search schools" }, { status: 500 });
//     }
// }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

const SEARCH_TTL = 600; // 10 minutes
export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ schools: [] });
    }

    const normalized = query.trim().toLowerCase();

    // 🔑 cache key
    const cacheKey = generateKey("schools:search:v3", normalized);

    const schools = await remember(
      cacheKey,
      async () => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[schools/search] QUERY → "${normalized}"`);
        }

        // 🧠 split words (hazaribagh jharkhand → ["hazaribagh","jharkhand"])
        const words = normalized.split(/\s+/).filter(Boolean);

        return prisma.school.findMany({
          where: {
            AND: words.map((word) => ({
              OR: [
              { name: { contains: word, mode: "insensitive" } },
              { city: { contains: word, mode: "insensitive" } },
              { state: { contains: word, mode: "insensitive" } },
              { location: { contains: word, mode: "insensitive" } },
              { schoolCode: { contains: word, mode: "insensitive" } }]

            }))
          },
          select: {
            id: true,
            name: true,
            schoolCode: true,
            location: true,
            city: true,
            state: true,
            profilePicture: true
          },
          take: 50 // fetch more for ranking
        });
      },
      SEARCH_TTL
    );

    // 🎯 Ranking logic (VERY IMPORTANT)
    const ranked = schools.
    map((s) => {
      let score = 0;

      const name = s.name?.toLowerCase() || "";
      const city = s.city?.toLowerCase() || "";
      const state = s.state?.toLowerCase() || "";

      if (name.includes(normalized)) score += 5;
      if (city.includes(normalized)) score += 3;
      if (state.includes(normalized)) score += 2;

      // word-level boost
      normalized.split(" ").forEach((word) => {
        if (name.includes(word)) score += 2;
        if (city.includes(word)) score += 1;
      });

      return { ...s, score };
    }).
    sort((a, b) => b.score - a.score).
    slice(0, 20); // final limit

    return NextResponse.json({ schools: ranked });

  } catch (err) {
    console.error("Error searching schools:", err);
    return NextResponse.json(
      { error: "Failed to search schools" },
      { status: 500 }
    );
  }
});