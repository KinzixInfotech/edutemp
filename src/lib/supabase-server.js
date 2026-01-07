/**
 * Supabase Server Client - Singleton for API routes
 * Use this instead of creating new clients in each API file
 * 
 * USAGE:
 * import { supabaseServer } from '@/lib/supabase-server';
 * 
 * const { data: { user } } = await supabaseServer.auth.getUser(token);
 */

import { createClient } from '@supabase/supabase-js';

// Singleton pattern - reuse client across requests
const globalForSupabase = globalThis;

function createSupabaseServer() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

// Cache in all environments to prevent creating new client per request
export const supabaseServer =
    globalForSupabase.supabaseServer ||
    createSupabaseServer();

globalForSupabase.supabaseServer = supabaseServer;

export default supabaseServer;
