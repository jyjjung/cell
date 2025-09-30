
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

  const handleThemeChange = (value: string) => {
    if (value === "system") {
      setTheme("system");
    } else {
      // When a custom theme is selected, we check the resolved base theme (light/dark)
      // and append it to apply the correct variant.
      if (resolvedTheme?.includes("dark")) {
        setTheme(`dark-${value}`);
      } else {
        setTheme(value);
      }
    }
  };

  return (
    <div className="space-y-2">
       <h3 className="text-sm font-medium flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Theme
        </h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => {
          // Animate is active if the theme string starts with the custom theme name,
          // or if both are 'system'.
          const isActive = t.value === "system" 
            ? theme === "system" 
            : theme?.includes(t.value);

          return (
            <Button
              key={t.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleThemeChange(t.value)}
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
