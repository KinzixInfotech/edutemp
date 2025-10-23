// pages/api/library/reports.js

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export default async function handler(req, res) {
    if (req.method === "GET") {
        const { schoolId, reportType, limit = 10 } = req.query;
        try {
            if (reportType === "mostBorrowed") {
                const books = await prisma.libraryBook.findMany({
                    where: { schoolId, issuedAt: { not: null } },
                    orderBy: { issuedAt: "desc" },
                    take: Number(limit),
                });
                return NextResponse.json(books);
            }

            if (reportType === "overdue") {
                const books = await prisma.libraryBook.findMany({
                    where: { schoolId, status: "issued", dueAt: { lt: new Date() } },
                });
                return NextResponse.json(books);
            }

            if (reportType === "inventory") {
                const report = await prisma.libraryBook.groupBy({
                    by: ["status"],
                    where: { schoolId },
                    _count: true,
                });
                return NextResponse.json(report);
            }

            if (reportType === "fines") {
                const report = await prisma.libraryBook.aggregate({
                    where: { schoolId, fineAmount: { gt: 0 } },
                    _sum: { fineAmount: true },
                });
                return NextResponse.json(report);
            }

            return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
        } catch (error) {
            return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}