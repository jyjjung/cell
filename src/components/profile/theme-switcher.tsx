
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { name: "Default", value: "system" }, // "system" will handle light/dark automatically
  { name: "Zinc", value: "theme-zinc" },
  { name: "Rose", value: "theme-rose" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const isThemeActive = (themeValue: string) => {
    if (themeValue === 'system' && (theme === 'system' || theme === 'light' || theme === 'dark')) {
      return true;
    }
    return theme === themeValue;
  };

  return (
    <div className="space-y-2">
       <h3 className="text-sm font-medium flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Theme
        </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => (
          <Button
            key={t.value}
            variant={isThemeActive(t.value) ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme(t.value)}
            className="justify-center"
          >
            {isThemeActive(t.value) && <Check className="mr-2 h-4 w-4" />}
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
