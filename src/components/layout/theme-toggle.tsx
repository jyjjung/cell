
"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const { currentUser, updateUserProfile } = useAuth()
  const { toast } = useToast()

  const handleModeChange = async (mode: 'light' | 'dark' | 'system') => {
    if (!currentUser) {
      toast({
        title: "Not Logged In",
        description: "You must be logged in to save theme preferences.",
        variant: "destructive"
      });
      // Also apply theme locally for non-logged-in users
      setTheme(mode);
      return;
    }
    try {
      await updateUserProfile(currentUser.uid, { mode });
      // The ThemeApplier in ThemeProvider will handle setting the theme
    } catch (error) {
      console.error("Failed to save mode preference:", error);
      toast({
        title: "Error",
        description: "Could not save your mode preference.",
        variant: "destructive"
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleModeChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleModeChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleModeChange("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
