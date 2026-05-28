"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Shield,
  Users,
  Calendar,
  Megaphone,
  ShieldCheck,
  ListTodo,
  ListChecks,
  BookOpen,
  Brain,
  MessageCircle,
  MessageSquarePlus,
} from "lucide-react";
import { usePageLoading } from "@/contexts/page-loading-context";
import { PageHeader } from "@/components/ui/page-layout";
import { useAllUsers } from "@/hooks/use-all-users";
import { useQTRoster } from "@/hooks/useQTRoster";
import { useNotifications } from "@/hooks/use-notifications";
import { isSameMonth, parseISO } from "date-fns";

export default function AdminHubPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { currentUser, loadingAuth, adminPasswordLogin, isAdmin } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);

  // --- LIVE DATA SUBSCRIPTIONS ---
  const { allUsers } = useAllUsers();
  const { roster } = useQTRoster();
  const { notifications } = useNotifications();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pendingApprovals = allUsers.filter((u) => !u.isApproved && !u.isAdmin).length;

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
    if (!success) setError("Invalid Access Key.");
  };

  const handleLaunch = (path: string) => {
    setIsPageLoading(true);
    router.push(path);
  };

  if (!isMounted || loadingAuth) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-page-title">Admin</h1>
          </div>

          {currentUser ? (
            <form onSubmit={handleAdminAuth} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" title="Access Key" className="sr-only">
                  Access Key
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter Access Key"
                  className="h-14 rounded-xl border-border text-center text-lg"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-center text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="h-12 w-full">
                <Lock className="mr-2 h-4 w-4" />
                Authenticate
              </Button>
            </form>
          ) : (
            <Button onClick={() => handleLaunch("/login")} className="h-12 w-full">
              Sign In to Portal
            </Button>
          )}
        </div>
      </div>
    );
  }

  const quickActions = [
    { title: "Announcements", href: "/admin/notifications", icon: Megaphone, badge: scheduledNotifs },
    { title: "QT Roster", href: "/admin/qt-roster", icon: ListChecks, badge: unassignedRosterDays },
    { title: "Cleaning Roster", href: "/admin/cleaning-roster", icon: ListTodo },
    { title: "Events", href: "/admin/events", icon: Calendar },
  ];

  const allSections = [
    { title: "Users", href: "/admin/users", icon: Users, badge: pendingApprovals },
    { title: "Roles", href: "/admin/groups", icon: ShieldCheck },
    { title: "Bible Plan", href: "/admin/bible-plan", icon: BookOpen },
    { title: "Memory Verses", href: "/admin/memory-verses", icon: Brain },
    { title: "Chats", href: "/admin/chats", icon: MessageCircle },
  ];

  const NavCard = ({ icon: Icon, title, href, badge }: { icon: React.ElementType; title: string; href: string; badge?: number }) => (
    <button
      onClick={() => handleLaunch(href)}
      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {typeof badge === "number" && badge > 0 ? (
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="admin-page max-w-4xl">
      <PageHeader title="Admin" description="Manage community operations from one place." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <NavCard key={action.href} {...action} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">All sections</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allSections.map((section) => (
            <NavCard key={section.href} {...section} />
          ))}
        </div>
      </section>

      <Button onClick={() => handleLaunch("/chat/system")} className="h-12 w-full sm:w-auto">
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Open system chat creator
      </Button>
    </div>
  );
}
