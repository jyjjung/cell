
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
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (isMounted && currentUser) {
      const userTheme = currentUser.theme || 'system';
      const userMode = currentUser.mode || 'system';
      
      let targetTheme: string;

      if (userTheme !== 'system') {
        // If a custom theme is set, we use it. The light/dark mode is handled by the `class` on <html>
        targetTheme = userTheme;
      } else {
        // If theme is 'system', then the mode (light/dark/system) dictates the theme.
        targetTheme = userMode;
      }
      
      if (activeTheme !== targetTheme) {
        setTheme(targetTheme);
      }
    }
  }, [currentUser, isMounted, activeTheme, setTheme]);

  return <>{children}</>;
}


export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'system', 'theme-zinc', 'theme-rose']}
      {...props}
    >
      <ThemeApplier>{children}</ThemeApplier>
    </NextThemesProvider>
  )
}
