// Transport Settings API - Manage auto-generation settings
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Fetch transport settings for a school
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        // Get or create default settings
        let settings = await prisma.transportSettings.findUnique({
            where: { schoolId }
        });

        // If no settings exist, return defaults (will be created on first save)
        if (!settings) {
            settings = {
                schoolId,
                autoGenerateTrips: true,
                generateDaysInAdvance: 1,
                generateTime: "06:00",
                operatingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
            };
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error fetching transport settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// PUT: Update transport settings
export async function PUT(req) {
    try {
        const data = await req.json();
        const { schoolId, autoGenerateTrips, generateDaysInAdvance, generateTime, operatingDays } = data;

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        // Validate operatingDays
        const validDays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        if (operatingDays && !operatingDays.every(day => validDays.includes(day))) {
            return NextResponse.json({ error: 'Invalid operating days' }, { status: 400 });
        }

        // Upsert settings
        const settings = await prisma.transportSettings.upsert({
            where: { schoolId },
            update: {
                autoGenerateTrips: autoGenerateTrips ?? true,
                generateDaysInAdvance: generateDaysInAdvance ?? 1,
                generateTime: generateTime ?? "06:00",
                operatingDays: operatingDays ?? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
            },
            create: {
                schoolId,
                autoGenerateTrips: autoGenerateTrips ?? true,
                generateDaysInAdvance: generateDaysInAdvance ?? 1,
                generateTime: generateTime ?? "06:00",
                operatingDays: operatingDays ?? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
            }
        });

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating transport settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
