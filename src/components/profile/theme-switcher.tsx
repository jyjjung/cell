
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
            variant={theme === t.value || (t.value === 'default' && !themes.slice(1).map(th=>'theme-'+th.value).includes(theme || '')) ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme(t.value === 'default' ? 'system' : `theme-${t.value}`)}
            className="justify-center"
          >
            {theme === t.value || (t.value === 'default' && !themes.slice(1).map(th=>'theme-'+th.value).includes(theme || '')) ? <Check className="mr-2 h-4 w-4" /> : null}
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
