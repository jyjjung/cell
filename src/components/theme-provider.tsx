
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

function ThemeApplier() {
    const { currentUser } = useAuth();
    const { setTheme, theme: currentNextTheme } = useTheme();

    React.useEffect(() => {
        if (currentUser) {
            const { mode, theme: themeName } = currentUser;
            let effectiveTheme: string;

            if (mode === 'system') {
                effectiveTheme = 'system';
            } else if (themeName === 'system') {
                effectiveTheme = mode || 'system';
            } else {
                if (mode === 'dark') {
                    effectiveTheme = `dark-${themeName}`;
                } else {
                    effectiveTheme = themeName || 'system';
                }
            }
            
            if (effectiveTheme !== currentNextTheme) {
                setTheme(effectiveTheme);
            }
        }
    }, [currentUser, setTheme, currentNextTheme]);

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
