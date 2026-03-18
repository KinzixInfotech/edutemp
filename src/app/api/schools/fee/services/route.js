/**
 * API Route: /api/schools/fee/services
 * Method: GET, POST, DELETE
 * Description: CRUD operations for master Services (Transport, Hostel, Activity, etc.)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
        }

        const services = await prisma.service.findMany({
            where: { schoolId },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({ success: true, services });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { id, schoolId, name, module, monthlyFee, isActive, metadata } = body;

        if (!schoolId || !name || monthlyFee === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (id) {
            // Update
            const service = await prisma.service.update({
                where: { id },
                data: { name, module: module || "SERVICE_CUSTOM", monthlyFee, isActive, metadata }
            });
            return NextResponse.json({ success: true, service });
        } else {
            // Create
            const service = await prisma.service.create({
                data: { schoolId, name, module: module || "SERVICE_CUSTOM", monthlyFee, isActive, metadata }
            });
            return NextResponse.json({ success: true, service });
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        // Check dependencies
        const linkedComponents = await prisma.feeComponent.count({ where: { serviceId: id } });
        if (linkedComponents > 0) {
            return NextResponse.json({ 
                error: "Cannot delete service. It is linked to active fee components. Deactivate it instead." 
            }, { status: 400 });
        }

        await prisma.service.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
