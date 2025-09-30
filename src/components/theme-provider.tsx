
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

// This inner component is the key to solving the issue.
// It listens to the user's preferences from our AuthContext and
// the system's theme from next-themes, then tells NextThemesProvider
// which final theme to apply (e.g., "dark-theme-zinc").
function ThemeResolver() {
  const { currentUser } = useAuth()
  const { setTheme, resolvedTheme } = useTheme() // resolvedTheme knows if system is light/dark

  React.useEffect(() => {
    const userTheme = currentUser?.theme || 'system' // e.g., 'system', 'theme-zinc'
    const userMode = currentUser?.mode || 'system'   // e.g., 'light', 'dark', 'system'

    let finalTheme: string;

    const isSystemDark = resolvedTheme === 'dark';

    if (userMode === 'dark' || (userMode === 'system' && isSystemDark)) {
      // Apply dark variant
      if (userTheme !== 'system') {
        finalTheme = `dark-${userTheme}`;
      } else {
        finalTheme = 'dark';
      }
    } else {
      // Apply light variant
      if (userTheme !== 'system') {
        finalTheme = userTheme;
      } else {
        finalTheme = 'light';
      }
    }
    
    // Tell next-themes to apply the calculated theme
    setTheme(finalTheme);

  }, [currentUser?.theme, currentUser?.mode, resolvedTheme, setTheme])

  return null // This component does not render anything itself.
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'system', 'theme-zinc', 'theme-rose', 'dark-theme-zinc', 'dark-theme-rose']}
      {...props}
    >
      <ThemeResolver />
      {children}
    </NextThemesProvider>
  )
}
