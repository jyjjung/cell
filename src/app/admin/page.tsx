"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, formFieldControlProps } from "@/components/ui/form-field";
import {
  Lock,
  Shield,
  Calendar,
  Megaphone,
  ListTodo,
  ListChecks,
  ClipboardList,
  FileText,
  BookOpen,
  Info,
} from "lucide-react";
import { usePageLoading } from "@/contexts/page-loading-context";
import { PageHeader } from "@/components/ui/page-layout";
import { PageLoading } from "@/components/ui/loading-spinner";
import { useQTRoster } from "@/hooks/useQTRoster";
import { useNotifications } from "@/hooks/use-notifications";
import { isSameMonth, parseISO } from "date-fns";
import { translations } from "@/lib/translations";
import { ReminderCronHealth } from "@/components/admin/reminder-cron-health";

export default function AdminHubPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { currentUser, loadingAuth, adminPasswordLogin, isAdmin } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || "en"];

  const { roster } = useQTRoster();
  const { notifications } = useNotifications();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentMonth = new Date();
  const unassignedRosterDays = roster.filter((r) => {
    if (!isSameMonth(parseISO(r.date), currentMonth)) return false;
    return !r.personName || !r.userId;
  }).length;

  const scheduledNotifs = notifications.filter(
    (n) => n.scheduledFor && n.scheduledFor.toDate() > new Date()
  ).length;

  const handleAdminAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await adminPasswordLogin(password);
    if (!success) setError(t.adminInvalidAccessKey);
  };

  const handleLaunch = (path: string) => {
    setIsPageLoading(true);
    router.push(path);
  };

  if (!isMounted || loadingAuth) return <PageLoading />;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-page-title">{t.admin}</h1>
          </div>

          {currentUser ? (
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <FormField id="admin-access-key" label={t.adminAccessKey} error={error || undefined}>
                <Input
                  {...formFieldControlProps('admin-access-key', error || undefined)}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-border text-center"
                />
              </FormField>
              <Button type="submit" className="h-11 w-full">
                <Lock className="mr-2 h-4 w-4" />
                {t.signIn}
              </Button>
            </form>
          ) : (
            <Button onClick={() => handleLaunch("/login")} className="h-10 w-full">
              {t.adminSignInFirst}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const sections = [
    { title: t.announcements, href: "/admin/notifications", icon: Megaphone, badge: scheduledNotifs },
    { title: t.qtRoster, href: "/admin/qt-roster", icon: ListChecks, badge: unassignedRosterDays },
    { title: t.cleaningRoster, href: "/admin/cleaning-roster", icon: ListTodo },
    { title: t.adminCustomRosters, href: "/admin/custom-rosters", icon: ClipboardList },
    { title: t.events, href: "/admin/events", icon: Calendar },
    { title: t.forms, href: "/admin/forms", icon: FileText },
    { title: t.adminBiblePlan, href: "/admin/bible-plan", icon: BookOpen },
    { title: t.adminInfoWidgets, href: "/admin/info-widgets", icon: Info },
  ];

  const NavCard = ({ icon: Icon, title, href, badge }: { icon: React.ElementType; title: string; href: string; badge?: number }) => (
    <Button
      type="button"
      variant="ghost"
      onClick={() => handleLaunch(href)}
      className="h-auto min-h-11 w-full justify-between rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-left"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {typeof badge === "number" && badge > 0 ? (
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {badge}
        </span>
      ) : null}
    </Button>
  );

  return (
    <div className="admin-page">
      <PageHeader title={t.admin} description={t.adminHubDesc} />

      <ReminderCronHealth />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sections.map((section) => (
          <NavCard key={section.href} {...section} />
        ))}
      </div>
    </div>
  );
}
