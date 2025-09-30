
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // next-themes internally adds the 'class' to the <html> tag based on the 'attribute' prop
  // and manages the light/dark/system logic.
  // When we choose a custom theme like 'theme-zinc', it sets `data-theme="theme-zinc"`
  // and also keeps `class="dark"` if the system is in dark mode.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
