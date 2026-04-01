"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock,
  Shield,
  Zap,
  Users,
  Calendar,
  BookOpen,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  ListTodo,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageLoading } from '@/contexts/page-loading-context';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-layout';
import { useAllUsers } from '@/hooks/use-all-users';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useNotifications } from '@/hooks/use-notifications';
import { isSameMonth, parseISO } from 'date-fns';

export default function AdminHubPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  const pendingApprovals = allUsers.filter(u => !u.isApproved && !u.isAdmin).length;
  
  const currentMonth = new Date();
  const unassignedRosterDays = roster.filter(r => {
      // Assuming r.date is 'YYYY-MM-DD'
      if (!isSameMonth(parseISO(r.date), currentMonth)) return false;
      return !r.personName || !r.userId;
  }).length;

  const scheduledNotifs = notifications.filter(n => n.scheduledFor && n.scheduledFor.toDate() > new Date()).length;


  const handleAdminAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await adminPasswordLogin(password);
    if (!success) setError('Invalid Access Key.');
  };

  const handleLaunch = (path: string) => {
    setIsPageLoading(true);
    router.push(path);
  };

  if (!isMounted || loadingAuth) return null;

  // --- LOGIN GATE ---
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-12"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-primary/10 rounded-3xl border border-primary/20 mb-4 backdrop-blur-xl">
              <Shield className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h1 className="text-page-title">Admin.</h1>
          </div>

          {currentUser ? (
            <form onSubmit={handleAdminAuth} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" title="Access Key" className="sr-only">Access Key</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter Access Key"
                  className="h-16 text-center text-xl font-black rounded-3xl bg-card/40 backdrop-blur-md border-2 border-primary/10 focus:border-primary transition-all"
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-micro-label text-destructive text-center p-3 bg-destructive/10 rounded-2xl border border-destructive/20 !opacity-100 italic">
                  {error}
                </motion.p>
              )}
              <Button type="submit" size="hero" className="w-full">
                <Lock className="mr-2 h-5 w-5" />
                Authenticate
              </Button>
            </form>
          ) : (
            <Button onClick={() => handleLaunch('/login')} className="w-full h-16 rounded-full text-lg font-black">
              Sign In to Portal
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // --- COMPACT COMMAND HUB ---
  const NavCard = ({ icon: Icon, title, desc, href, indicator }: any) => (
    <button
      onClick={() => handleLaunch(href)}
      className="group relative flex flex-col p-5 rounded-2xl bg-card/10 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left w-full h-full"
    >
      <div className="flex items-center gap-3 w-full mb-3">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <h3 className="font-bold tracking-tight text-base flex-1">{title}</h3>
          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary/60" />
      </div>
      <p className="text-xs text-muted-foreground/80 leading-snug line-clamp-2">{desc}</p>
      
    </button>
  );

  return (
    <div className="relative space-y-12 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader 
        title="Admin Hub" 
        description="Unified Management Suite"
        icon={Zap}
        accentColor="text-primary"
        iconBgColor="bg-primary/10"
      />

      {/* Sector 1: Users & Access */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Users & Access</h2>
          <div className="h-px bg-border/50 flex-grow" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <NavCard
            icon={Users}
            title="Users"
            desc="Manage users, roles, and authorize new community members."
            href="/admin/users"
            color="bg-primary"
            indicator={pendingApprovals}
          />
          <NavCard
            icon={ShieldCheck}
            title="Roles"
            desc="Configure permission tiers and role-linked messaging groups."
            href="/admin/groups"
            color="bg-blue-500"
          />
          <NavCard
            icon={Megaphone}
            title="Announcements"
            desc="Send urgent community messages and system-wide alerts."
            href="/admin/notifications"
            color="bg-orange-500"
            indicator={scheduledNotifs}
          />
        </div>
      </section>

      {/* Sector 2: Schedules & Sync */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Schedules & Sync</h2>
          <div className="h-px bg-border/50 flex-grow" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <NavCard
            icon={Calendar}
            title="Events"
            desc="Orchestrate the community calendar and sync schedules."
            href="/admin/events"
            color="bg-green-500"
          />
          <NavCard
            icon={Layers}
            title="QT Roster"
            desc="Assign spiritual sharing duties and sharing rotations."
            href="/admin/qt-roster"
            color="bg-purple-500"
            indicator={unassignedRosterDays}
          />
          <NavCard
            icon={ListTodo}
            title="Service Rota"
            desc="Manage cleaning teams and facility maintenance rotations."
            href="/admin/cleaning-roster"
            color="bg-emerald-500"
          />
        </div>
      </section>

      {/* Sector 3: Spiritual Growth */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Spiritual Core</h2>
          <div className="h-px bg-border/50 flex-grow" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <NavCard
            icon={BookOpen}
            title="Bible Plan"
            desc="Configure the global reading sequence and milestones."
            href="/admin/bible-plan"
            color="bg-red-500"
          />
          <NavCard
            icon={Lock}
            title="Memorization"
            desc="Curate scripture portions for community study tracks."
            href="/admin/memory-verses"
            color="bg-amber-500"
          />
        </div>
      </section>
    </div>
  );
}
