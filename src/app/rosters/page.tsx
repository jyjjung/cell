"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardList, ChevronRight } from "lucide-react";
import { NavPageHeader, EmptyState, FeedCard } from "@/components/ui/page-layout";
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
        <div className="empty-inline gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-micro-label">{t.loadingRoster}</p>
        </div>
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
              <button
                key={def.id}
                type="button"
                onClick={() => router.push(`/rosters/${def.id}`)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30"
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
              </button>
            );
          })}
        </FeedCard>
      )}
    </div>
  );
}
