
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { name: "Default", value: "default" },
  { name: "Zinc", value: "zinc" },
  { name: "Rose", value: "rose" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const isThemeActive = (themeValue: string) => {
    if (themeValue === 'default') {
      // "Default" is active if the current theme is 'system', 'light', 'dark', or not one of the custom themes.
      return !theme?.startsWith('theme-');
    }
    return theme === `theme-${themeValue}`;
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
            onClick={() => setTheme(t.value === 'default' ? 'system' : `theme-${t.value}`)}
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
