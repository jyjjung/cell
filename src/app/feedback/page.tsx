"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lightbulb, History, Send, Loader2, Clock, Check, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Animation variants ─────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ── Status helpers ──────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; classes: string }> = {
  completed: { icon: Check,   label: 'Completed',   classes: 'bg-green-500/10 text-green-600' },
  'in-progress': { icon: Loader2, label: 'In Progress', classes: 'bg-blue-500/10 text-blue-600' },
  pending:  { icon: Clock,   label: 'Pending',     classes: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.classes}`}>
      <Icon className={`w-3 h-3 ${status === 'in-progress' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

/* ── Changelogs ──────────────────────────────────────────── */

const changelogs = [
  {
    version: "v1.2.1",
    date: "Mid-May 2026",
    changes: [
      "Fixed M'Cheyne duplicate passage checking with date-scoped keys and auto-migrated legacy keys",
      "Corrected typo in Genesis 37:18 within engESV.xml",
    ],
  },
  {
    version: "v1.2.0",
    subtitle: "Chat & Performance Overhaul",
    date: "Early-May 2026",
    changes: [
      "Optimized chat with O(1) user lookups and enhanced reaction UI with detailed popovers",
      "Critical mobile performance fixes: Removed per-bubble Firestore listeners and reduced DOM density",
      "Extreme stability fixes: Removed background image priming and singleton subscriptions for global hooks",
      "Refactored components: Moved userMap to parent and TooltipProvider to layout to prevent crashes",
    ],
  },
  {
    version: "v1.1.2",
    date: "May 5, 2026",
    changes: [
      "Redesigned dashboard schedule and upcoming duties UI",
      "Modernized dashboard roster view and condensed layout",
      "Optimized Bible reading widget to show only past missed reading and single unread passage",
      "Restored standard font sizes in dashboard",
    ],
  },
  {
    version: "v1.1.1",
    subtitle: "Profiles & PWA",
    date: "Late-April 2026",
    changes: [
      "Added profile picture image upload and cropping support",
      "Implemented caching for profile pictures, chats, and worship setlists",
      "Added user settings to hide bible reading progress and removed 'member since' from public profile",
      "Simplified PWA config, fixed mobile zoom issues, and modernized profile pages",
    ],
  },
  {
    version: "v1.1.0",
    subtitle: "Notifications Revamp",
    date: "Mid-April 2026",
    changes: [
      "Switched header dropdown to a tabbed panel showing Notifications, Announcements, and Messages",
      "Cleanly removed redundant alerts section from sidebar and dashboard stats row",
      "Hardened push notification reliability with APNS priority headers and token pruning",
      "Fixed background notifications, app badging, and token accumulation issues on mobile",
      "Added breadcrumbs navigation for mobile screens",
    ],
  },
  {
    version: "v1.0.1",
    date: "Early-April 2026",
    changes: [
      "Fixed PDF rendering to support multi-page scrolling and added external link fallback",
      "Restricted PDF uploads for chord sheets and implemented message deletion in chat",
      "Fixed the global Plus button launcher to correctly open the command menu",
    ],
  },
];

/* ── Page ────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const router = useRouter();
  const { currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');

  /* ── Firestore listener ───────────────────────────────── */

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestionsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  /* ── Handlers ─────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        text: suggestion,
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.firstName || 'Anonymous',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({ title: "Success", description: "Suggestion submitted! Thank you." });
      setSuggestion('');
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit suggestion. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), { status: newStatus });
      toast({ title: "Status Updated", description: "Feedback status has been updated." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleSaveNote = async (id: string) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), { adminNote: adminNoteText });
      toast({ title: "Note Saved", description: "Admin response has been added." });
      setEditingNoteId(null);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save note." });
    }
  };

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 md:px-20 py-12 max-w-4xl">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="hover:bg-primary/5 -ml-4 font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-10">

          {/* Header */}
          <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight">
            Feedback &amp; <span className="text-primary">Updates.</span>
          </motion.h1>

          {/* Tabs */}
          <motion.div variants={fadeUp}>
            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="suggestions" className="rounded-lg font-bold">
                  <Lightbulb className="w-4 h-4 mr-2" /> Suggestions
                </TabsTrigger>
                <TabsTrigger value="changelog" className="rounded-lg font-bold">
                  <History className="w-4 h-4 mr-2" /> Changelog
                </TabsTrigger>
              </TabsList>

              {/* ─── Suggestions ─────────────────────────────── */}
              <TabsContent value="suggestions" className="space-y-8">
                {/* Submit form */}
                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-1">Have an idea?</h2>
                  <p className="text-muted-foreground text-sm mb-5">
                    We&apos;re always looking to improve. Let us know what you&apos;d like to see!
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                      placeholder="I think it would be great if..."
                      className="min-h-[140px] resize-none rounded-xl focus-visible:ring-primary/50"
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={!suggestion.trim() || isSubmitting} className="rounded-xl font-bold">
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Suggestion
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Suggestion list */}
                {suggestionsList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg px-1">Community Feedback</h3>

                    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
                      {suggestionsList.map((item) => (
                        <motion.div
                          key={item.id}
                          variants={fadeUp}
                          className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-4">
                            {/* Left content */}
                            <div className="min-w-0 flex-1 space-y-3">
                              <p className="font-medium text-[15px]">{item.text}</p>

                              {/* Admin note (read-only) */}
                              {item.adminNote && editingNoteId !== item.id && (
                                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-sm">
                                  <span className="text-micro-label text-primary block mb-1">Admin Response</span>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{item.adminNote}</p>
                                </div>
                              )}

                              {/* Admin note (editing) */}
                              {editingNoteId === item.id && (
                                <div className="space-y-2">
                                  <Textarea
                                    value={adminNoteText}
                                    onChange={(e) => setAdminNoteText(e.target.value)}
                                    placeholder="Write an admin response..."
                                    className="min-h-[80px] text-sm"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                                    <Button size="sm" onClick={() => handleSaveNote(item.id)}>Save Note</Button>
                                  </div>
                                </div>
                              )}

                              {/* Meta line */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <span>{item.userName}</span>
                                <span>•</span>
                                <span>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                              </div>
                            </div>

                            {/* Status badge (admin = dropdown, user = static) */}
                            <div className="shrink-0">
                              {isAdmin ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="transition-opacity hover:opacity-80">
                                      <StatusBadge status={item.status} />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                    <DropdownMenuItem
                                      onClick={() => { setEditingNoteId(item.id); setAdminNoteText(item.adminNote || ''); }}
                                      className="text-xs font-bold rounded-lg cursor-pointer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 mr-2" />
                                      {item.adminNote ? 'Edit Note' : 'Add Note'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'pending')} className="text-xs font-bold rounded-lg cursor-pointer">
                                      <Clock className="w-3.5 h-3.5 mr-2" /> Mark Pending
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'in-progress')} className="text-xs font-bold rounded-lg cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-500/10">
                                      <Loader2 className="w-3.5 h-3.5 mr-2" /> Mark In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'completed')} className="text-xs font-bold rounded-lg cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-500/10">
                                      <Check className="w-3.5 h-3.5 mr-2" /> Mark Completed
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <StatusBadge status={item.status} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Changelog ───────────────────────────────── */}
              <TabsContent value="changelog">
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
                  {changelogs.map((log, index) => (
                    <motion.div
                      key={index}
                      variants={fadeUp}
                      className="relative pl-6 border-l-2 border-primary/20 last:border-transparent"
                    >
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background" />

                      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-xl font-black">{log.version}</h3>
                        {log.subtitle && (
                          <span className="text-sm font-semibold text-primary/70">{log.subtitle}</span>
                        )}
                        <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {log.date}
                        </span>
                      </div>

                      <ul className="mt-3 space-y-2">
                        {log.changes.map((change, i) => (
                          <li key={i} className="text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1.5">•</span>
                            <span className="font-medium leading-relaxed">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
