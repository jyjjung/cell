
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

// This inner component will handle applying the user's theme from the DB
// once it's loaded on the client.
function ThemeApplier({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { setTheme, theme: activeTheme } = useTheme();

  React.useEffect(() => {
    if (currentUser) {
      const userTheme = currentUser.theme || 'system';
      const userMode = currentUser.mode || 'system';

      let targetTheme: string;
      if (userTheme !== 'system') {
        // A custom theme is selected
        if (userMode === 'dark') {
          targetTheme = `dark-${userTheme}`;
        } else if (userMode === 'light') {
          targetTheme = userTheme;
        } else {
          // system preference
          targetTheme = userTheme; // next-themes handles adding .dark for system
        }
      } else {
        // Default theme, just use the mode
        targetTheme = userMode;
      }

      if (activeTheme !== targetTheme) {
        setTheme(targetTheme);
      }
    }
  }, [currentUser, activeTheme, setTheme]);

  return <>{children}</>;
}


export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'system', 'theme-zinc', 'theme-rose', 'dark-theme-zinc', 'dark-theme-rose']}
      {...props}
    >
      <ThemeApplier>{children}</ThemeApplier>
    </NextThemesProvider>
  )
}
