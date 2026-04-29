import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveSchoolIdForUser } from '@/lib/school-account-state';
import { getSchoolTenantByHost } from '@/lib/school-tenant-server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/reset-password' : '/dashboard');
    const appRedirect = requestUrl.searchParams.get('appRedirect');

    if (code) {
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
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth code exchange error:', error);
            const allCookies = cookieStore.getAll();
            console.log('Cookies present in callback:', allCookies.map(c => c.name));
            return NextResponse.redirect(`${requestUrl.origin}/forgot-password?error=auth_exchange_failed`);
        }

        // ── CRITICAL: Verify user exists in the database ──
        if (type !== 'recovery') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // First try to find by ID
                let dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { id: true, status: true, email: true },
                });

                // If not found by ID (common with OAuth creating new auth users), try by email
                if (!dbUser && user.email) {
                    dbUser = await prisma.user.findUnique({
                        where: { email: user.email },
                        select: { id: true, status: true, email: true },
                    });

                    // If found by email, it means they logged in with Google but their email was
                    // already registered in our DB with a different ID.
                    // Ideally we should update the DB ID to match the new OAuth ID to keep them synced.
                    if (dbUser && dbUser.status === 'ACTIVE') {
                        try {
                            console.log(`Syncing user ID for ${user.email} from ${dbUser.id} to ${user.id}`);
                            await prisma.user.update({
                                where: { email: user.email },
                                data: { id: user.id }
                            });
                        } catch (updateErr) {
                            console.error('Failed to update user ID during OAuth sync:', updateErr);
                            // If update fails (e.g. constraints), we still let them through
                            // but ideally log the error.
                        }
                    }
                }

                if (!dbUser || dbUser.status !== 'ACTIVE') {
                    // User doesn't exist in DB or is inactive — sign them out and reject
                    console.warn(`OAuth rejected: ${user.email} not found in User table or inactive`);
                    await supabase.auth.signOut();
                    const loginUrl = new URL('/login', requestUrl.origin);
                    loginUrl.searchParams.set('error', 'account_not_found');
                    loginUrl.searchParams.set('message', 'No account found for this email. Please contact your school administrator.');
                    return NextResponse.redirect(loginUrl);
                }

                const tenantSchool = await getSchoolTenantByHost(requestUrl.host);
                if (tenantSchool) {
                    const userWithRole = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { id: user.id },
                                ...(user.email ? [{ email: user.email }] : []),
                            ],
                        },
                        include: { role: true },
                    });

                    const userSchoolId = await resolveSchoolIdForUser(userWithRole);
                    if (!userSchoolId || userSchoolId !== tenantSchool.id) {
                        await supabase.auth.signOut();
                        const loginUrl = new URL('/login', requestUrl.origin);
                        loginUrl.searchParams.set('error', 'account_not_found');
                        loginUrl.searchParams.set('message', 'No account found for this school.');
                        return NextResponse.redirect(loginUrl);
                    }
                }
            }
        }
    }

    // URL to redirect to after sign in process completes
    const redirectUrl = new URL(next, request.url);
    if (appRedirect) {
        redirectUrl.searchParams.set('appRedirect', appRedirect);
    }
    return NextResponse.redirect(redirectUrl);
}
