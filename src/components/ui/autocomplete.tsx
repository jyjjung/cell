"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
    placeholder?: string;
    searchPlaceholder?: string;
    emptyPlaceholder?: string;
    disabled?: boolean;
}

export function Autocomplete({ 
    options, 
    value, 
    onChange,
    placeholder = "Select an option...",
    disabled = false
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value ? options.find(o => o.value === value)?.label || '' : '');

  const selectedOption = React.useMemo(() => options.find(o => o.value === value), [options, value]);

  React.useEffect(() => {
    setInputValue(selectedOption?.label || '');
  }, [selectedOption]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
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
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pr-10"
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {inputValue && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear} type="button">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {!inputValue && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent input from losing focus
      >
        <Command filter={(value, search) => {
            const option = options.find(o => o.value === value);
            if(option) {
              return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }
            return 0;
        }}>
          <CommandInput value={inputValue} onValueChange={setInputValue} className="h-9" />
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
                    onChange(currentValue === value ? "" : currentValue);
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
