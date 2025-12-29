import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { invalidatePattern } from '@/lib/cache';

// Quick utility route to clear SMS caches
export async function POST(req) {
    try {
        await redis.del('sms:pricing:config');
        await invalidatePattern('sms:recipients:*');

        return NextResponse.json({ success: true, message: 'SMS caches (pricing & recipients) cleared' });
    } catch (error) {
        console.error('Cache clear error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
