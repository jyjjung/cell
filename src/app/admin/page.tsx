
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
  MessageCircle, 
  Megaphone, 
  ArrowRight,
  ShieldCheck,
  ListTodo,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AdminHubPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { currentUser, loadingAuth, adminPasswordLogin, isAdmin } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAdminAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await adminPasswordLogin(password);
    if (!success) setError('Invalid Escalation Key.');
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
              <div className="inline-flex p-4 bg-primary/5 rounded-3xl border border-primary/10 mb-4">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-2xl font-black tracking-tighter text-foreground leading-none uppercase">Admin.</h1>
              <p className="text-muted-foreground font-medium italic">Identification required for <span className="text-foreground font-bold">{currentUser?.email || 'Unauthorized User'}</span></p>
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
                    placeholder="Escalation Key"
                    className="h-16 text-center text-xl font-black rounded-3xl bg-muted/20 border-2 focus:border-primary transition-all"
                  />
                </div>
                {error && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-black uppercase tracking-widest text-destructive text-center">
                        Access Denied: {error}
                    </motion.p>
                )}
                <Button type="submit" className="w-full h-16 rounded-full text-lg font-black shadow-xl shadow-primary/10 active:scale-95 transition-all">
                  <Lock className="mr-2 h-5 w-5" />
                  Establish Override
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

  // --- COMMAND CENTER HUB ---
  const NavCard = ({ icon: Icon, title, desc, href, color }: any) => (
    <button
        onClick={() => handleLaunch(href)}
        className="group relative flex flex-col items-start p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all text-left overflow-hidden"
    >
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 mb-6 group-hover:scale-110 transition-transform`}>
            <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <h3 className="text-xl font-black tracking-tight mb-2 uppercase">{title}</h3>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2">{desc}</p>
        
        <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-40 group-hover:opacity-100 transition-opacity">
            Access Terminal <ArrowRight className="h-3 w-3" />
        </div>

        {/* Backdrop visual */}
        <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity rotate-12">
            <Icon className="h-32 w-32" />
        </div>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-24 px-4">
      <header className="space-y-6">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase">Admin.</h1>
            <div className="flex items-center gap-2 text-primary">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Unified Management Engine</p>
            </div>
        </div>
      </header>

      {/* Sector 1: Identity & Access */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Identity & Access</h2>
            <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NavCard 
                icon={Users} 
                title="Users" 
                desc="Manage identities, roles, and authorize new members." 
                href="/admin/users" 
                color="bg-primary" 
            />
            <NavCard 
                icon={ShieldCheck} 
                title="Roles" 
                desc="Configure permission tiers and role-linked messaging." 
                href="/admin/groups" 
                color="bg-blue-500" 
            />
            <NavCard 
                icon={Megaphone} 
                title="Announcements" 
                desc="Send urgent community messages and system alerts." 
                href="/admin/notifications" 
                color="bg-orange-500" 
            />
        </div>
      </section>

      {/* Sector 2: Schedules & Sync */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Schedules & Sync</h2>
            <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NavCard 
                icon={Calendar} 
                title="Events" 
                desc="Orchestrate the community calendar and import schedules." 
                href="/admin/events" 
                color="bg-green-500" 
            />
            <NavCard 
                icon={Layers} 
                title="QT Roster" 
                desc="Assign spiritual sharing duties to members." 
                href="/admin/qt-roster" 
                color="bg-purple-500" 
            />
            <NavCard 
                icon={ListTodo} 
                title="Service Rota" 
                desc="Manage cleaning teams and maintenance modules." 
                href="/admin/cleaning-roster" 
                color="bg-emerald-500" 
            />
        </div>
      </section>

      {/* Sector 3: Spiritual Growth */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Spiritual Growth</h2>
            <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NavCard 
                icon={BookOpen} 
                title="Bible Plan" 
                desc="Configure the global reading sequence and milestones." 
                href="/admin/bible-plan" 
                color="bg-red-500" 
            />
            <NavCard 
                icon={Lock} 
                title="Memory Verses" 
                desc="Curate scripture portions for community memorization." 
                href="/admin/memory-verses" 
                color="bg-amber-500" 
            />
            <NavCard 
                icon={MessageCircle} 
                title="Other Rosters" 
                desc="Create custom rosters for specific ministry teams." 
                href="/admin/rosters" 
                color="bg-cyan-500" 
            />
        </div>
      </section>
    </div>
  );
}
