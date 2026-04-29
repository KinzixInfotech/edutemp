import { supabase } from '@/lib/supabase';

export async function fetchWithAuth(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
