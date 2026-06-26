"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-layout";
import { DocNav, type DocNavItem } from "@/components/legal/doc-section";

export function DocPage({
  title,
  description,
  meta,
  nav,
  children,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  nav: DocNavItem[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="page-container-wide !pb-8">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button variant="ghost" onClick={() => router.back()} className="h-9 rounded-xl font-semibold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <DocNav items={nav} className="lg:w-44 lg:shrink-0 lg:sticky lg:top-6" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
