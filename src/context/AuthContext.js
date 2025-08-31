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
                console.log("📦 Using cached user from localStorage");
                setFullUser(JSON.parse(cached));
                return;
            }

            // 2️⃣ Otherwise fetch from API
            setLoading(true);
            setLoadingMsg('Initializing....');
            const res = await fetch(`/api/auth/user?id=${sessionUser.id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });
            const data = await res.json();

            if (res.ok) {
                console.log("✅ Full User:", data);
                setFullUser(data);
                localStorage.setItem("user", JSON.stringify(data)); // cache it
                setLoadingMsg('Initialized....');
            } else {
                console.error("❌ Failed to fetch full user:", data.error);
                setLoadingMsg('Initialization Failed. Check your connection....');
            }
        } catch (err) {
            console.error("❌ Error fetching user:", err);
            setLoadingMsg('Initialization Failed. Check your connection....');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;

            // 🔹 First try cached user
            const cachedUser = localStorage.getItem("user");
            if (cachedUser) {
                console.log("📦 Using cached user from localStorage");
                setFullUser(JSON.parse(cachedUser));
            }

            // 🔹 If no cached user or session changed → fetch fresh
            if (currentUser && !cachedUser) {
                await fetchUser(currentUser);
            }
        };

        getInitialSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            console.log("🔁 Auth change detected. User:", currentUser);
            if (currentUser) {
                fetchUser(currentUser); // will update cache + fullUser
            } else {
                setUser(null);
                setFullUser(null);
                // localStorage.removeItem("user"); // clear cache on logout
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, fullUser, loading, loadingMsg }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
