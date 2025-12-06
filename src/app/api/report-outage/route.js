
import { NextResponse } from 'next/server';
import { autoStatuspage } from '@/lib/autoStatuspageSync';

export async function POST(request) {
    try {
        const body = await request.json();
        const { error, type } = body;

        // Only allow reporting severe database errors to avoid spamming statuspage
        if (type !== 'DATABASE_DOWN') {
            return NextResponse.json({ message: 'Ignored' });
        }

        // Trigger a database component update to "major_outage"
        // We reuse the updateComponentStatus logic from the library
        // We need to fetch existing components first to find the Database ID
        const components = await autoStatuspage.getExistingComponents();
        const dbComponent = autoStatuspage.findComponentByName(components, 'Database');

        if (dbComponent) {
            // Check removed to ensure Incident is created even if status is already down (for testing/verification)
            // if (dbComponent.status === 'major_outage') { ... }

            await autoStatuspage.updateComponentStatus(
                dbComponent.id,
                'down', // This maps to 'major_outage'
                `Automatic Report: Database connection unreachable. Error: ${error?.substring(0, 100)}`
            );

            // Create an incident for this outage
            await autoStatuspage.autoCreateIncident({}, [{
                category: 'Database',
                componentId: dbComponent.id,
                status: 'down'
            }]);

            console.log('✅ Statuspage updated via Client Report: Database Down & Incident Created');
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to report outage:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
