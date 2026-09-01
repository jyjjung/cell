"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

type Props = {
  options: string[];
  onChange: (next: string[]) => void;
  label?: string;
};

export default function FieldOptionsEditor({ options, onChange, label = 'Options' }: Props) {
  const [draft, setDraft] = useState('');

  const addOption = () => {
    const next = draft.trim();
    if (!next) return;
    if (options.includes(next)) {
      setDraft('');
      return;
    }
    onChange([...options, next]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {options.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <li
              key={opt}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-sm"
            >
              <span>{opt}</span>
              <IconButton
                size="compact"
                aria-label={`Remove ${opt}`}
                icon={X}
                onClick={() => onChange(options.filter((x) => x !== opt))}
                className="text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Add at least one option.</p>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type an option"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={addOption} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
