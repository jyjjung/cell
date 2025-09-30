
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/auth-context"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { currentUser } = useAuth()
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const userTheme = currentUser?.theme;
  const userMode = currentUser?.mode;

  const forcedTheme = userTheme && userTheme !== 'system' ? userTheme : undefined;

  // Only render the provider with the user's theme after the component has mounted on the client.
  // Before that, render a null or a basic version to avoid server-client mismatch.
  if (!isMounted) {
    return null; 
  }
  
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
