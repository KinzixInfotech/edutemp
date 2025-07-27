import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * @param {import('next/server').NextRequest} request
 */
export async function updateSession(request) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    supabaseResponse = NextResponse.next({ request });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // DO NOT put logic between createClient and getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    const isPublic =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/auth');

    if (!user && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
