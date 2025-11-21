// app/api/partners/leads/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const status = searchParams.get("status");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        const where = { partnerId };
        if (status && status !== "ALL") {
            where.status = status;
        }

        const leads = await prisma.partnerLead.findMany({
            where,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            leads,
            total: leads.length
        });

    } catch (error) {
        console.error("Fetch leads error:", error);
        return NextResponse.json(
            { error: "Failed to fetch leads" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            partnerId,
            schoolName,
            contactPerson,
            contactPhone,
            contactEmail,
            address,
            city,
            state,
            postalCode,
            estimatedStudents,
            currentSystem,
            notes
        } = body;

        // Validation
        if (!partnerId || !schoolName || !contactPerson || !contactPhone || !contactEmail) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check for duplicate lead
        const existingLead = await prisma.partnerLead.findFirst({
            where: {
                partnerId,
                contactEmail
            }
        });

        if (existingLead) {
            return NextResponse.json(
                { error: "Lead with this email already exists" },
                { status: 400 }
            );
        }

        // Create lead
        const lead = await prisma.$transaction(async (tx) => {
            const newLead = await tx.partnerLead.create({
                data: {
                    partnerId,
                    schoolName,
                    contactPerson,
                    contactPhone,
                    contactEmail,
                    address,
                    city,
                    state,
                    postalCode,
                    estimatedStudents: estimatedStudents ? parseInt(estimatedStudents) : null,
                    currentSystem,
                    notes,
                    status: "NEW"
                },
                include: {
                    partner: {
                        select: {
                            contactPerson: true,
                            contactPhone: true
                        }
                    }
                }
            });

            // Log activity
            await tx.leadActivity.create({
                data: {
                    leadId: newLead.id,
                    activityType: "LEAD_CREATED",
                    description: `Lead created by partner ${newLead.partner.contactPerson}`,
                    newStatus: "NEW"
                }
            });

            // Update partner lead count
            await tx.partner.update({
                where: { id: partnerId },
                data: {
                    totalLeads: { increment: 1 }
                }
            });

            // Log partner activity
            await tx.partnerActivity.create({
                data: {
                    partnerId,
                    activityType: "LEAD_ADDED",
                    description: `Added new lead: ${schoolName}`,
                    metadata: { leadId: newLead.id }
                }
            });

            return newLead;
        });

        return NextResponse.json({
            success: true,
            message: "Lead created successfully",
            lead
        }, { status: 201 });

    } catch (error) {
        console.error("Create lead error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create lead" },
            { status: 500 }
        );
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, status, notes, nextFollowUp, assignedToId } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Lead ID is required" },
                { status: 400 }
            );
        }

        const currentLead = await prisma.partnerLead.findUnique({
            where: { id }
        });

        if (!currentLead) {
            return NextResponse.json(
                { error: "Lead not found" },
                { status: 404 }
            );
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (notes) updateData.notes = notes;
        if (nextFollowUp) updateData.nextFollowUp = new Date(nextFollowUp);
        if (assignedToId) {
            updateData.assignedToId = assignedToId;
            updateData.assignedAt = new Date();
        }

        const lead = await prisma.$transaction(async (tx) => {
            const updated = await tx.partnerLead.update({
                where: { id },
                data: {
                    ...updateData,
                    lastFollowUp: new Date()
                },
                include: {
                    assignedTo: {
                        select: { name: true, email: true }
                    }
                }
            });

            // Log activity
            if (status && status !== currentLead.status) {
                await tx.leadActivity.create({
                    data: {
                        leadId: id,
                        activityType: "STATUS_CHANGE",
                        description: `Status changed from ${currentLead.status} to ${status}`,
                        oldStatus: currentLead.status,
                        newStatus: status
                    }
                });
            }

            if (assignedToId) {
                await tx.leadActivity.create({
                    data: {
                        leadId: id,
                        activityType: "ASSIGNMENT",
                        description: `Lead assigned to ${updated.assignedTo?.name || 'team member'}`,
                        performedBy: assignedToId
                    }
                });
            }

            return updated;
        });

        return NextResponse.json({
            success: true,
            message: "Lead updated successfully",
            lead
        });

    } catch (error) {
        console.error("Update lead error:", error);
        return NextResponse.json(
            { error: "Failed to update lead" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    const body = await req.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json(
            { error: "Lead ID is required" },
            { status: 400 }
        );
    }

    try {
        await prisma.partnerLead.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: "Lead deleted successfully"
        });

    } catch (error) {
        console.error("Delete lead error:", error);
        return NextResponse.json(
            { error: "Failed to delete lead" },
            { status: 500 }
        );
    }
}