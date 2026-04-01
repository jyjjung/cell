// Shared page layout primitives for consistent cross-page design
"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { usePathname } from 'next/navigation';
import { getRouteTheme } from '@/lib/theme-colors';

interface PageHeaderProps {
  title: string;
  subtitle?: string; // Kept for backwards compatibility
  description?: string; // New field for the body text
  icon?: React.ElementType; // New field for the large icon
  accentColor?: string; // Deprecated: overridden by route theme
  iconBgColor?: string; // Deprecated: overridden by route theme
  action?: React.ReactNode;
  delay?: number;
}

export function PageHeader({ title, subtitle, description, icon: Icon, accentColor, iconBgColor, action, delay = 0 }: PageHeaderProps) {
  const pathname = usePathname() || '';
  const theme = getRouteTheme(pathname);

  // Force universal theme compliance: ignore passed colors in favor of route theme
  const finalAccentColor = theme.headerText;
  const finalIconBgColor = theme.headerBg;

  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6"
    >
      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-3 rounded-2xl", finalIconBgColor, finalAccentColor)}>
              <Icon className="w-8 h-8" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className={cn("text-hero tracking-tighter capitalize", finalAccentColor)}>{title}</h1>
          </div>
        </div>
      </div>
      {action && <div className="shrink-0 mt-2 sm:mt-0">{action}</div>}
    </motion.header>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border-2 border-dashed border-border/40"
    >
      <Icon className="h-10 w-10 text-muted-foreground/30 mb-4" />
      <h3 className="text-base font-bold text-muted-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">{description}</p>}
    </motion.div>
  );
}

interface FeedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function FeedCard({ children, className, index = 0 }: FeedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn("rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 hover:shadow-md transition-shadow", className)}
    >
      {children}
    </motion.div>
  );
}
