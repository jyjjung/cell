
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
  const { theme, setTheme, resolvedTheme } = useTheme();

  // On the server, 'theme' might be undefined, so we check.
  // 'resolvedTheme' gives us the actual theme ('light' or 'dark') even if 'theme' is 'system'.
  const currentTheme = theme || 'system';

  return (
    <div className="space-y-2">
       <h3 className="text-sm font-medium flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Theme
        </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => {
          const isActive = currentTheme === t.value;
          return (
            <Button
              key={t.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(t.value)}
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
