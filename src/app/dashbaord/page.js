'use client';

import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
    const { user, role, loading } = useAuth();

    if (loading) return <p>Loading...</p>;

    return (
        <div className="p-4">
            <h1 className="text-2xl">Welcome, {user.email}!</h1>
            <p>Your role: {role ?? 'Loading...'}</p>
        </div>
    );
}
