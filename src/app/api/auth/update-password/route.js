import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const { password } = await request.json();

        // Verify session
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // usage from server component, ignore
                        }
                    },
                },
            }
        );

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const email = session.user.email;

        // Update Prisma User with a bcrypt hash; Supabase owns the usable auth secret.
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: await bcrypt.hash(password, 10)
            }
        });

        console.log(`Password updated for user ${email} (ID: ${userId})`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update password API error:', error);
        return NextResponse.json(
            { error: 'Failed to update password' },
            { status: 500 }
        );
    }
}
