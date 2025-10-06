'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [fullUser, setFullUser] = useState(null) // ✅ you were missing this
    const [loading, setLoading] = useState(false)
    const [loadingMsg, setLoadingMsg] = useState('')

    const fullUserRef = useRef(null);

    const safeSetFullUser = (newUser) => {
        if (JSON.stringify(fullUserRef.current) !== JSON.stringify(newUser)) {
            fullUserRef.current = newUser;
            setFullUser(newUser);
        }
    }
    // ✅ safe setter (prevents re-renders if data is same)
    // const safeSetFullUser = (newUser) => {
    //     setFullUser((prev) => {
    //         if (!prev && newUser) return newUser
    //         if (!newUser && prev) return null

    //         // Deep compare
    //         const same = JSON.stringify(prev) === JSON.stringify(newUser)
    //         return same ? prev : newUser
    //     })
    // }

    const fetchUser = async (sessionUser) => {
        try {
            setUser(sessionUser)
            if (!sessionUser) {
                setFullUser(null)
                return
            }

            // 1️⃣ Try cache first
            const cached = localStorage.getItem('user')
            if (cached) {
                safeSetFullUser(JSON.parse(cached))
                return
            }

            // 2️⃣ Fetch from API
            setLoading(true)
            setLoadingMsg('Initializing...')
            const token = (await supabase.auth.getSession()).data.session?.access_token
            const res = await fetch(`/api/auth/user?userId=${sessionUser.id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await res.json()
            if (res.ok) {
                safeSetFullUser(data)
                localStorage.setItem('user', JSON.stringify(data))
            } else {
                console.error('API failed:', res.status, data)
            }
        } catch (err) {
            console.error('❌ Error fetching user:', err)
            setLoadingMsg('Initialization Failed. Check your connection...')
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {


        console.log(fullUser);

    }, [fullUser])

    useEffect(() => {
        const getInitialSession = async () => {
            try {
                setLoading(true)
                const { data } = await supabase.auth.getSession()
                const currentUser = data.session?.user ?? null

                // load from cache
                const cachedUser = localStorage.getItem('user')
                if (cachedUser) {
                    safeSetFullUser(JSON.parse(cachedUser))
                }

                // fetch fresh only if logged in but no cache
                if (currentUser && !cachedUser) {
                    await fetchUser(currentUser)
                }
            } catch (err) {
                console.error('Error getting initial session:', err)
            } finally {
                setLoading(false)
            }
        }

        getInitialSession()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null
            if (currentUser) {
                fetchUser(currentUser)
            } else {
                setUser(null)
                setFullUser(null)
                localStorage.removeItem('user')
            }
        })

        return () => subscription.unsubscribe()
    }, [])


    const value = useMemo(
        () => ({ user, fullUser, loading, loadingMsg }),
        [user, fullUser, loading, loadingMsg]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
