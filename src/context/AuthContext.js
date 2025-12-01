'use client';
export const dynamic = 'force-dynamic';


import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [fullUser, setFullUser] = useState(null)
    const [loading, setLoading] = useState(true) // Start with true
    const [loadingMsg, setLoadingMsg] = useState('Loading...')
    const router = useRouter()

    const fullUserRef = useRef(null);

    const safeSetFullUser = (newUser) => {
        if (JSON.stringify(fullUserRef.current) !== JSON.stringify(newUser)) {
            fullUserRef.current = newUser;
            setFullUser(newUser);
        }
    }

    const fetchUser = async (sessionUser) => {
        try {
            setUser(sessionUser)
            if (!sessionUser) {
                setFullUser(null)
                localStorage.removeItem('user')
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

            if (!token) {
                console.error('No access token available')
                setFullUser(null)
                return
            }

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
                // If API fails, clear session
                if (res.status === 401) {
                    await supabase.auth.signOut()
                    router.push('/login')
                }
            }
        } catch (err) {
            console.error('❌ Error fetching user:', err)
            setLoadingMsg('Initialization Failed. Check your connection...')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const getInitialSession = async () => {
            try {
                setLoading(true)
                setLoadingMsg('Checking session...')

                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Session error:', error)
                    setLoading(false)
                    return
                }

                const currentUser = data.session?.user ?? null
                setUser(currentUser)

                // Load from cache first for faster UI
                const cachedUser = localStorage.getItem('user')
                if (cachedUser) {
                    safeSetFullUser(JSON.parse(cachedUser))
                }

                // Fetch fresh data if logged in
                if (currentUser) {
                    await fetchUser(currentUser)
                }
            } catch (err) {
                console.error('Error getting initial session:', err)
            } finally {
                setLoading(false)
            }
        }

        getInitialSession()

        // Listen to auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event)

            const currentUser = session?.user ?? null

            // Handle different auth events
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in')
                    await fetchUser(currentUser)
                    break

                case 'SIGNED_OUT':
                    console.log('👋 User signed out')
                    setUser(null)
                    setFullUser(null)
                    localStorage.removeItem('user')
                    router.push('/login')
                    break

                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed successfully')
                    // Session is still valid, no need to refetch user
                    break

                case 'USER_UPDATED':
                    console.log('📝 User updated')
                    if (currentUser) {
                        await fetchUser(currentUser)
                    }
                    break

                default:
                    // Handle other events
                    if (currentUser) {
                        await fetchUser(currentUser)
                    } else {
                        setUser(null)
                        setFullUser(null)
                        localStorage.removeItem('user')
                    }
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
