"use client";

import { cn } from "@/lib/utils";

export type DocNavItem = { id: string; label: string };

export function DocNav({ items, className }: { items: DocNavItem[]; className?: string }) {
  return (
    <nav aria-label="Table of contents" className={cn("text-sm", className)}>
      <p className="mb-2 font-medium text-foreground">Contents</p>
      <ol className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DocArticle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card text-sm leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <div className="divide-y divide-border/40">{children}</div>
    </article>
  );
}

export function DocIntro({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-5 sm:px-7">{children}</div>;
}

export function DocSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 px-5 py-5 sm:px-7 sm:py-6", className)}>
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground/50">
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
    <div className="-mx-1 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left">
            <th className="px-2 py-2 pr-4 font-medium text-foreground sm:px-0">Category</th>
            <th className="px-2 py-2 pr-4 font-medium text-foreground">Examples</th>
            <th className="px-2 py-2 font-medium text-foreground">Why we keep it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b border-border/30 align-top last:border-b-0">
              <td className="px-2 py-2.5 pr-4 font-medium text-foreground sm:px-0">{row.category}</td>
              <td className="px-2 py-2.5 pr-4">{row.examples}</td>
              <td className="px-2 py-2.5">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocStepList({
  steps,
}: {
  steps: { title: string; description: string }[];
}) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 text-xs font-medium text-foreground">
            {i + 1}
          </span>
          <div>
            <p className="font-medium text-foreground">{step.title}</p>
            <p className="mt-1">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
