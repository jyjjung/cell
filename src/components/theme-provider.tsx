
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

function ThemeApplier() {
    const { currentUser } = useAuth();
    const { setTheme } = useTheme();

    React.useEffect(() => {
        if (currentUser?.theme && currentUser?.mode) {
            let effectiveTheme = currentUser.theme;
            if (currentUser.mode === 'dark' && currentUser.theme !== 'system') {
                effectiveTheme = `dark-${currentUser.theme}`;
            } else if (currentUser.mode === 'light' && currentUser.theme !== 'system') {
                effectiveTheme = currentUser.theme;
            } else { // system mode
                effectiveTheme = 'system';
            }
             setTheme(effectiveTheme);
        } else if (currentUser) {
            setTheme('system'); // fallback for user with no settings
        }
    }, [currentUser, setTheme]);

    return null;
}

export function ThemeProvider({ children, ...props }: Omit<ThemeProviderProps, 'attribute' | 'themes'>) {
  return (
    <NextThemesProvider 
        attribute="class"
        themes={['light', 'dark', 'system', 'theme-zinc', 'dark-theme-zinc', 'theme-rose', 'dark-theme-rose']}
        {...props}
    >
        <ThemeApplier />
        {children}
    </NextThemesProvider>
  )
}
