"use client";

import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

type OfferingEntry = {
  labelKey: 'offeringWeekly' | 'offeringTithes' | 'offeringThanksgiving' | 'offeringConstruction' | 'offeringMissions';
  account: string;
  holder?: string;
};

const OFFERINGS: OfferingEntry[] = [
  { labelKey: 'offeringWeekly', account: '111', holder: 'Ye-Joon Jung' },
  { labelKey: 'offeringTithes', account: '101' },
  { labelKey: 'offeringThanksgiving', account: '365' },
  { labelKey: 'offeringConstruction', account: '123' },
  { labelKey: 'offeringMissions', account: '999' },
];

export default function OnlineOfferingsWidget() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  return (
    <div className="space-y-2 border-b border-border/50 pb-4">
      <p className="text-eyebrow">{t.onlineOfferings}</p>
      <ul className="space-y-1.5">
        {OFFERINGS.map((entry) => (
          <li
            key={entry.labelKey}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-muted-foreground">{t[entry.labelKey]}</span>
            <span className="text-right font-medium tabular-nums text-foreground">
              {entry.account}
              {entry.holder ? (
                <span className="font-normal text-muted-foreground">
                  {' — '}
                  {entry.holder}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
