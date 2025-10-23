'use client'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react'

const Provider = ({ children }) => {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

export default Provider