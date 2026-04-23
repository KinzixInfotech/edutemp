'use client';
export const dynamic = 'force-dynamic';
;

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children, ...props }) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
