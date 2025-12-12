import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/reset-password';

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
            // Debug: Log available cookies to see if verifier is missing
            const allCookies = cookieStore.getAll();
            console.log('Cookies present in callback:', allCookies.map(c => c.name));

            // Redirect back to forgot password with error
            return NextResponse.redirect(`${requestUrl.origin}/forgot-password?error=auth_exchange_failed`);
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, request.url));
}
