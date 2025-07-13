'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);       // Supabase user
    const [fullUser, setFullUser] = useState(null); // Prisma user with role + schoolId
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSessionAndUser = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const supabaseUser = session;
                setUser(supabaseUser);
                console.log("📦 Supabase User:", supabaseUser);

                if (supabaseUser?.user.email) {
                    const res = await fetch(`/api/auth/user?email=${supabaseUser.user.email}`);
                    const data = await res.json();

                    if (res.ok) {
                        console.log("✅ Full User:", data);
                        setFullUser(data);
                    } else {
                        console.error("❌ Failed to fetch full user:", data.error);
                    }
                }
            } catch (err) {
                console.error("❌ Auth loading error:", err);
            } finally {
                setLoading(false);
            }
        };

        getSessionAndUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            console.log("🔁 Auth change detected. User:", currentUser);
            setUser(currentUser);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, fullUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
