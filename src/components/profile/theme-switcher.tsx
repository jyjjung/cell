
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const themes = [
  { name: "Default", value: "system" },
  { name: "Zinc", value: "theme-zinc" },
  { name: "Rose", value: "theme-rose" },
];

export function ThemeSwitcher() {
  const { currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const handleThemeChange = async (themeValue: string) => {
    if (!currentUser) {
      toast({
        title: "Not Logged In",
        description: "You need to be logged in to change your theme.",
        variant: "destructive"
      });
      return;
    }
    setIsSavingTheme(true);
    try {
      await updateUserProfile(currentUser.uid, { theme: themeValue });
      // The ThemeProvider will react to the change in currentUser context
    } catch (error) {
      console.error("Failed to save theme preference:", error);
      toast({
        title: "Error",
        description: "Could not save your theme preference.",
        variant: "destructive"
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  const activeTheme = currentUser?.theme || 'system';

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium flex items-center">
        <Palette className="mr-2 h-4 w-4" />
        Theme
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => {
          const isActive = t.value === activeTheme;
          return (
            <Button
              key={t.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleThemeChange(t.value)}
              className="justify-center"
              disabled={isSavingTheme}
            >
              {isSavingTheme && isActive ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isActive ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {t.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
