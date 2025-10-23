import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const { email, password, name, role } = await req.json();

        // Basic validation
        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Supabase Auth signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,  //  this adds `name` to user_metadata
                    role  
                }
            }
        });

        if (error || !data.user) {
            return NextResponse.json(
                { error: error?.message || 'Signup failed' },
                { status: 400 }
            );
        }

        // Save in custom model: platformAdmin
        const newAdmin = await prisma.platformAdmin.create({
            data: {
                id: data.user.id, // Supabase UID
                email,
                name,
                role: role.toUpperCase(),
            },
        });

        return NextResponse.json({ success: true, admin: newAdmin }, { status: 201 });

    } catch (err) {
        console.error('[SIGNUP_ERROR]', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
