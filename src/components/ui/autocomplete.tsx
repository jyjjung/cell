"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "./input"

export interface AutocompleteOption {
    value: string;
    label: string;
}

interface AutocompleteProps {
    options: AutocompleteOption[];
    value?: string;
    onChange: (value: string) => void;
    label?: string; // Changed from placeholder to label
    disabled?: boolean;
}

export function Autocomplete({ 
    options, 
    value, 
    onChange,
    label = "Select an option...",
    disabled = false
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const selectedOption = React.useMemo(() => options.find(o => o.value === value), [options, value]);

  // When value prop changes (e.g. form reset), update the input text
  React.useEffect(() => {
    setInputValue(selectedOption?.label || '');
  }, [selectedOption]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);

    // If user clears the input, we should update the form value
    if (newInputValue === '') {
      onChange('');
    }
    
    if (!open) setOpen(true);
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
            <label 
                htmlFor="autocomplete-input" 
                className={cn(
                    "absolute left-3 text-muted-foreground transition-all duration-200 ease-in-out pointer-events-none",
                    (inputValue || open) ? "top-1.5 text-xs" : "top-1/2 -translate-y-1/2 text-sm"
                )}
            >
                {label}
            </label>
            <Input
                id="autocomplete-input"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                className={cn(
                    "w-full pr-10",
                    (inputValue || open) ? "pt-5" : ""
                )}
                disabled={disabled}
                aria-autocomplete="list"
                aria-expanded={open}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {inputValue && !disabled && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-full"
                    aria-label="Clear selection"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
                )}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
            </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command filter={(value, search) => {
            const option = options.find(o => o.value.toLowerCase() === value.toLowerCase());
            if(option) {
              return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }
            return 0;
        }}>
          <CommandInput value={inputValue} onValueChange={setInputValue} className="h-9" placeholder="Search book..."/>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    const selected = options.find(o => o.value.toLowerCase() === currentValue.toLowerCase())
                    if (selected) {
                        onChange(selected.value);
                        setInputValue(selected.label);
                    }
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              );
            })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}