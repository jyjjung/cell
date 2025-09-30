
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { name: "Default", value: "system" },
  { name: "Zinc", value: "theme-zinc" },
  { name: "Rose", value: "theme-rose" },
];

export function ThemeSwitcher() {
  const { theme, setTheme, systemTheme } = useTheme();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium flex items-center">
        <Palette className="mr-2 h-4 w-4" />
        Theme
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => {
          let isActive = false;
          if (t.value === 'system') {
            isActive = theme === 'system';
          } else {
            // Check if the current theme is either the light or dark version of the custom theme
            isActive = theme === t.value || theme === `dark-${t.value}`;
          }

          return (
            <Button
              key={t.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (t.value === 'system') {
                  setTheme('system');
                } else {
                  // For custom themes, next-themes will automatically append .dark
                  // if system theme is dark, so we just set the base theme name.
                  setTheme(systemTheme === 'dark' ? `dark-${t.value}` : t.value);
                }
              }}
              className="justify-center"
            >
              {isActive && <Check className="mr-2 h-4 w-4" />}
              {t.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
