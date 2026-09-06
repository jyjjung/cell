'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { bottomHubIconClass, bottomHubTabClass } from '@/components/layout/bottom-hub-bar';
import { IconButton } from '@/components/ui/icon-button';
import { NavigationButton } from '@/components/ui/navigation';

type HubTabProps = {
  active: boolean;
  label: ReactNode;
  icon: ElementType;
  onClick: () => void;
  className?: string;
};

/** Bottom hub navigation tab — 44px hit target, aria-current, shared styles. */
export function HubTab({ active, label, icon: Icon, onClick, className }: HubTabProps) {
  return (
    <NavigationButton
      onClick={onClick}
      className={cn(bottomHubTabClass(active), className)}
      active={active}
      icon={<Icon className={bottomHubIconClass(active)} aria-hidden />}
      label={<span className="truncate">{label}</span>}
    />
  );
}

type HubTabIconButtonProps = {
  label: string;
  icon: ElementType;
  onClick: () => void;
  className?: string;
  iconClassName?: string;
};

/** Center action in a hub bar (e.g. Bible reader, admin menu trigger). */
export function HubTabIconButton({
  label,
  icon: Icon,
  onClick,
  className,
  iconClassName,
}: HubTabIconButtonProps) {
  return (
    <IconButton
      aria-label={label}
      icon={Icon}
      onClick={onClick}
      variant="outline"
      className={cn('rounded-full border-border', className)}
      iconClassName={iconClassName}
    />
  );
}
