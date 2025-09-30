"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // By setting the attribute to 'data-theme', we instruct next-themes to manage all
  // theme variations (light, dark, custom) through this single data attribute.
  // This resolves the conflict where 'class' was used for dark mode and 'data-theme'
  // for custom themes, ensuring correct theme application.
  return <NextThemesProvider attribute="data-theme" {...props}>{children}</NextThemesProvider>
}
