"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronRight } from "lucide-react";
import { PageLoading } from '@/components/ui/loading-spinner';
import { NavPageHeader, EmptyState, FeedCard } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { useRosterDefinitions } from "@/hooks/useRosterDefinitions";
import { userCanSeeRoster, userCanEditRoster } from "@/lib/roster-access";

export default function CustomRostersIndexPage() {
  const router = useRouter();
  const { currentUser, isAdmin, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || "en"];
  const { definitions, loading } = useRosterDefinitions();

  const visibleRosters = useMemo(() => {
    if (!currentUser) return [];
    return definitions.filter((def) => userCanSeeRoster(currentUser, def, isAdmin));
  }, [definitions, currentUser, isAdmin]);

  if (loadingAuth || loading) {
    return (
      <div className="page-container">
        <PageLoading label={t.loadingRoster} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <NavPageHeader title={t.customRosters} />

      {visibleRosters.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t.adminNoCustomRosters}
        />
      ) : (
        <FeedCard className="divide-y divide-border/40 p-0 overflow-hidden">
          {visibleRosters.map((def) => {
            const canEdit = currentUser
              ? userCanEditRoster(currentUser, def, isAdmin)
              : false;
            return (
              <Button
                key={def.id}
                type="button"
                variant="ghost"
                onClick={() => router.push(`/rosters/${def.id}`)}
                className="h-auto min-h-11 w-full items-center justify-between gap-3 rounded-none px-4 py-4 text-left hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{def.name}</p>
                  <p className="text-micro-label text-muted-foreground">
                    {(def.fields?.length ?? 0) > 0
                      ? `${def.fields!.length} fields`
                      : t.rosterNoFields}
                    {canEdit ? " · Can edit" : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            );
          })}
        </FeedCard>
      )}
    </div>
  );
}
