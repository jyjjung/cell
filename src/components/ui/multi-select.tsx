"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export type MultiSelectItem = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectItem[];
  selected: string[];
  onChange: (value: string[]) => void;
  className?: string;
  placeholder?: string;
}

function matchesFilter(label: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return label.toLowerCase().includes(normalized);
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (itemValue: string) => {
    onChange(selected.filter((s) => s !== itemValue));
  };

  const selectables = React.useMemo(
    () =>
      options.filter(
        (option) =>
          !selected.includes(option.value) && matchesFilter(option.label, inputValue),
      ),
    [options, selected, inputValue],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (inputValue === "" && selected.length > 0) {
        onChange(selected.slice(0, selected.length - 1));
      }
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  const addOption = (itemValue: string) => {
    setInputValue("");
    onChange([...selected, itemValue]);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((itemValue) => {
            const item = options.find((o) => o.value === itemValue);
            return (
              <Badge key={itemValue} variant="secondary">
                {item?.label}
                <IconButton
                  size="compact"
                  aria-label={`Remove ${item?.label ?? itemValue}`}
                  icon={X}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(itemValue);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(itemValue)}
                />
              </Badge>
            );
          })}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-expanded={open}
            aria-autocomplete="list"
            className="ml-2 min-w-[8ch] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {open && selectables.length > 0 ? (
        <ul
          role="listbox"
          className="absolute top-full z-10 mt-2 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in"
        >
          {selectables.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                className="flex w-full cursor-pointer select-none items-center rounded-xl px-2 py-2 text-left text-sm outline-none transition-all duration-200 ease-out hover:bg-accent/50 hover:text-accent-foreground focus-visible:bg-accent/50 focus-visible:text-accent-foreground active:scale-[0.98]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => addOption(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
