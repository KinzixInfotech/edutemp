import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side
);

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 401 });
        }

        const userId = authData.user.id;

        // Fetch parent data from Prisma
        const parent = await prisma.parent.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profilePicture: true,
                    }
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        publicProfile: {
                            select: {
                                id: true
                            }
                        }
                    }
                },
                studentLinks: {
                    include: {
                        student: {
                            select: {
                                userId: true,
                                name: true,
                                classId: true,
                                class: {
                                    select: {
                                        id: true,
                                        className: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) {
            // User exists in Supabase but not as a parent in Prisma
            await supabase.auth.signOut();
            return NextResponse.json(
                { error: 'Only parents can login here. For school admin, use the main login.' },
                { status: 403 }
            );
        }

        // Return session data with parent info
        return NextResponse.json({
            success: true,
            session: authData.session,
            user: {
                id: parent.user.id,
                email: parent.user.email,
                name: parent.user.name || parent.name,
                profilePicture: parent.user.profilePicture,
                role: 'PARENT',
                parent: {
                    id: parent.id,
                    schoolId: parent.schoolId,
                    school: parent.school,
                    students: parent.studentLinks.map(link => ({
                        userId: link.student.userId,
                        name: link.student.name,
                        class: link.student.class
                    }))
                }
            }
        });

    } catch (error) {
        console.error('[PARENT LOGIN ERROR]', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
