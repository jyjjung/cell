
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

export function ThemeProvider({ children, ...props }: Omit<ThemeProviderProps, 'attribute' | 'themes'>) {
  const { currentUser } = useAuth();

  // Determine the theme to apply based on user settings.
  // The `theme` prop in `NextThemesProvider` takes precedence. `enableSystem` handles the 'system' mode.
  const userTheme = currentUser?.theme;
  const userMode = currentUser?.mode;

  // Let next-themes handle 'system' mode.
  // If a specific theme is set, force it. If not, don't force anything and let system/mode toggle work.
  const forcedTheme = userTheme && userTheme !== 'system' ? userTheme : undefined;
  
  return (
    <NextThemesProvider 
        attribute="class"
        defaultTheme={userMode || "system"}
        forcedTheme={forcedTheme}
        enableSystem
        {...props}
    >
        {children}
    </NextThemesProvider>
  )
}
