// Shared page layout primitives for consistent cross-page design
"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  action?: React.ReactNode;
  delay?: number;
}

export function PageHeader({ title, subtitle, accentColor = 'text-primary', action, delay = 0 }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="space-y-1.5 min-w-0">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">{title}</h1>
        {subtitle && <p className={cn("text-xs font-bold uppercase tracking-[0.1em]", accentColor, "opacity-80 drop-shadow-sm")}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
      <p className="font-semibold text-sm text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>}
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
