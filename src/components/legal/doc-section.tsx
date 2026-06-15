"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type DocNavItem = { id: string; label: string };

export function DocNav({ items, className }: { items: DocNavItem[]; className?: string }) {
  return (
    <nav className={cn("glass-thin rounded-2xl p-4", className)}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="mr-2 text-muted-foreground/50">{String(i + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DocSummary({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      {title ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">{title}</p>
      ) : null}
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function DocSection({
  id,
  title,
  icon: Icon,
  index = 0,
  children,
  className,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  index?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn("scroll-mt-24 space-y-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="pt-1.5 text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
      </div>
      <div className="space-y-3 pl-0 text-sm leading-relaxed text-muted-foreground sm:pl-[52px]">
        {children}
      </div>
    </motion.section>
  );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-primary/60">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function DocDataTable({
  rows,
}: {
  rows: { category: string; examples: string; purpose: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50">
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-3 sm:border-b sm:border-border/40 sm:bg-muted/30 sm:px-4 sm:py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Category</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Examples</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Purpose</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.category}
          className={cn(
            "grid gap-1 border-border/40 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-3 sm:py-3",
            i !== 0 && "border-t"
          )}
        >
          <p className="font-semibold text-foreground">{row.category}</p>
          <p className="sm:col-start-2">{row.examples}</p>
          <p className="text-muted-foreground sm:col-start-3">{row.purpose}</p>
        </div>
      ))}
    </div>
  );
}

export function DocStepGrid({
  steps,
}: {
  steps: { title: string; description: string }[];
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="rounded-xl border border-border/50 bg-muted/20 p-4"
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Step {i + 1}
          </p>
          <p className="font-semibold text-foreground">{step.title}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
