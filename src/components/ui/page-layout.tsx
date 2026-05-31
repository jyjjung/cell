// Shared page layout primitives for consistent cross-page design
"use client";

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  delay?: number;
}

export function PageHeader({ title, description, action, delay = 0 }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-nav flex flex-col gap-1 rounded-2xl px-4 py-2 sm:flex-row sm:items-start sm:justify-between sm:px-5"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl capitalize">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action && <div className="mt-0.5 shrink-0 sm:mt-0">{action}</div>}
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
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/35 px-6 py-12 text-center"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/45">
        <Icon className="h-5 w-5 text-muted-foreground/70" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </motion.div>
  );
}

interface FeedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function FeedCard({ children, className, index = 0, animate = true }: FeedCardProps & { animate?: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: animate ? index * 0.04 : 0, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass-card rounded-2xl p-4 transition-shadow", className)}
    >
      {children}
    </motion.div>
  );
}
