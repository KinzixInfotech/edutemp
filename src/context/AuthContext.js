'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);        // Supabase user
    const [fullUser, setFullUser] = useState(null); // Prisma user with role + schoolId
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');

    // ⛳ Unified fetch user method
    const fetchUser = async (sessionUser) => {
        try {
            setUser(sessionUser);

            if (!sessionUser) {
                setFullUser(null);
                return;
            }

            // 1️⃣ Try localStorage first
            const cached = localStorage.getItem("user");
            if (cached) {
                setFullUser(JSON.parse(cached));
                return;
            }

            // 2️⃣ Otherwise fetch from API
            setLoading(true);
            setLoadingMsg('Initializing....');
            const res = await fetch(`/api/auth/user?userId=${sessionUser.id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });
            const data = await res.json();

        

            if (res.ok) {
                setFullUser(data);
            } else {
                console.error("API failed:", res.status, data);
            }
        } catch (err) {
            console.error("❌ Error fetching user:", err);
            setLoadingMsg('Initialization Failed. Check your connection....');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        //  Function to get initial session and user
        const getInitialSession = async () => {

            try {
                setLoading(true)
                const { data } = await supabase.auth.getSession();
                // console.log(data);

                // Get current user from session
                const currentUser = data.session?.user ?? null;


                // 🔹 First try cached user
                const cachedUser = localStorage.getItem("user");
                if (cachedUser) {
                    setFullUser(JSON.parse(cachedUser));
                }

                // 🔹 If no cached user or session changed → fetch fresh
                if (currentUser && !cachedUser) {
                    await fetchUser(currentUser);
                }
            } catch (error) {
                console.error("Error getting initial session:", error);
            } finally {
                setLoading(false)
            }
        };

        getInitialSession();

        //  Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;

            if (currentUser) {
                fetchUser(currentUser); // updates cache + fullUser
            } else {
                setUser(null);
                setFullUser(null);
                localStorage.removeItem("user"); // optional: clear cache on logout
            }
        });
        // Cleanup subscription on unmount
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {

        // console.log(fullUser, 'from auth context');

    }, [fullUser])


    return (
        <AuthContext.Provider value={{ user, fullUser, loading, loadingMsg }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
