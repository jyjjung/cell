"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Clock, Check, MessageSquare, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavPageHeader, FeedCard } from '@/components/ui/page-layout';
import { formatAppDateTime, getAppLocale, getStatusLabel } from '@/lib/formatting';
import { notifyFeedbackChange } from '@/lib/feedback-notify';
import { changelogs } from '@/data/changelogs';
import {
  CHANGELOG_TYPE_CLASSES,
  type ChangelogEntry,
} from '@/lib/changelog-types';

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

const STATUS_CONFIG: Record<string, { icon: React.ElementType; classes: string }> = {
  completed: { icon: Check, classes: 'bg-success/10 text-success' },
  'not-possible': { icon: XCircle, classes: 'bg-destructive/10 text-destructive' },
  'in-progress': { icon: Loader2, classes: 'bg-muted text-primary' },
  pending: { icon: Clock, classes: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status, locale }: { status: string; locale: 'en' | 'ko' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-micro-label font-medium ${cfg.classes}`}>
      <Icon className={`spinner-standard w-3 h-3 ${status === 'in-progress' ? 'animate-spin' : ''}`} />
      {getStatusLabel(status, locale)}
    </span>
  );
}

/* ── Changelogs ──────────────────────────────────────────── */

function getExactChangelogDate(log: ChangelogEntry): string {
  return log.date;
}


/* ── Page ────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const { currentUser, isAdmin } = useAuth();
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('suggestions');

  /* ── Firestore listener ───────────────────────────────── */

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'), limit(50));
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
      const docRef = await addDoc(collection(db, 'suggestions'), {
        text: suggestion,
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.firstName || 'Anonymous',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      void notifyFeedbackChange({
        action: 'submitted',
        suggestionId: docRef.id,
        previewText: suggestion.trim(),
      });
      toast({ title: "Success", description: "Suggestion submitted! Thank you." });
      setSuggestion('');
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit suggestion. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (item: any, newStatus: string) => {
    try {
      const payload: Record<string, any> = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'not-possible') {
        if (!item.completedAt) payload.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'suggestions', item.id), payload);
      void notifyFeedbackChange({
        action: 'status_updated',
        suggestionId: item.id,
        previewText: item.text,
        status: newStatus,
      });
      toast({ title: "Status Updated", description: "Feedback status has been updated." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleSaveNote = async (id: string) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), {
        adminNote: adminNoteText,
        respondedAt: adminNoteText.trim() ? serverTimestamp() : null,
      });
      const item = suggestionsList.find((s) => s.id === id);
      void notifyFeedbackChange({
        action: 'admin_note_updated',
        suggestionId: id,
        previewText: item?.text,
      });
      toast({ title: "Note Saved", description: "Admin response has been added." });
      setEditingNoteId(null);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save note." });
    }
  };

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="page-container">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">

          <NavPageHeader />

          {/* Tabs */}
          <motion.div variants={fadeUp}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 h-10">
                <TabsTrigger value="suggestions" className="rounded-md text-sm font-medium">
                  Suggestions
                </TabsTrigger>
                <TabsTrigger value="changelog" className="rounded-md text-sm font-medium">
                  Changelog
                </TabsTrigger>
              </TabsList>

              {/* ─── Suggestions ─────────────────────────────── */}
              <TabsContent value="suggestions" className="space-y-4">
                {/* Submit form */}
                <FeedCard className="p-4">
                  <h2 className="mb-1 text-base font-semibold">Have an idea?</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    We&apos;re always looking to improve. Let us know what you&apos;d like to see!
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                      placeholder="I think it would be great if..."
                      className="min-h-[120px] resize-none rounded-xl focus-visible:ring-primary/50"
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" variant="primary" disabled={!suggestion.trim() || isSubmitting} className="h-9 rounded-xl">
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Suggestion
                      </Button>
                    </div>
                  </form>
                </FeedCard>

                {/* Suggestion list */}
                {suggestionsList.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="px-1 text-sm font-semibold text-muted-foreground">Community Feedback</h3>

                    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                      {suggestionsList.map((item, index) => (
                        <FeedCard
                          key={item.id}
                          index={index}
                          className="p-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <p className="min-w-0 flex-1 text-sm font-medium">{item.text}</p>
                              {/* Status badge (admin = dropdown, user = static) */}
                              <div className="shrink-0">
                                {isAdmin ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="transition-opacity hover:opacity-80">
                                        <StatusBadge status={item.status} locale={locale} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                                      <DropdownMenuItem
                                        onClick={() => { setEditingNoteId(item.id); setAdminNoteText(item.adminNote || ''); }}
                                        className="text-xs font-bold rounded-lg cursor-pointer"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 mr-2" />
                                        {item.adminNote ? 'Edit Note' : 'Add Note'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'pending')} className="text-xs font-bold rounded-lg cursor-pointer">
                                        <Clock className="w-3.5 h-3.5 mr-2" /> Mark Pending
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'in-progress')} className="text-xs font-bold rounded-lg cursor-pointer text-foreground focus:text-foreground focus:bg-muted">
                                        <Loader2 className="w-3.5 h-3.5 mr-2" /> Mark In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'completed')} className="text-xs font-bold rounded-lg cursor-pointer text-success focus:text-success focus:bg-success/10">
                                        <Check className="w-3.5 h-3.5 mr-2" /> Mark Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'not-possible')} className="text-xs font-bold rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <XCircle className="w-3.5 h-3.5 mr-2" /> Not Possible
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <StatusBadge status={item.status} locale={locale} />
                                )}
                              </div>
                            </div>

                            {/* Admin note (read-only) */}
                            {item.adminNote && editingNoteId !== item.id && (
                              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                                <div className="mb-1.5 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  <span className="text-micro-label text-primary">Admin response</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{item.adminNote}</p>
                              </div>
                            )}

                            {/* Admin note (editing) */}
                            {editingNoteId === item.id && (
                              <div className="w-full space-y-2">
                                <Textarea
                                  value={adminNoteText}
                                  onChange={(e) => setAdminNoteText(e.target.value)}
                                  placeholder="Write an admin response..."
                                  className="min-h-[72px] text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                                  <Button size="sm" variant="primary" className="h-8 rounded-lg" onClick={() => handleSaveNote(item.id)}>Save Note</Button>
                                </div>
                              </div>
                            )}

                            {/* Timeline */}
                            <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                              <p className="mb-2 text-micro-label text-muted-foreground">Timeline</p>
                              <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                  <span>Posted</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.createdAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Response left</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.respondedAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>{item.status === 'not-possible' ? 'Closed' : 'Completed'}</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.completedAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </FeedCard>
                      ))}
                    </motion.div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Changelog ───────────────────────────────── */}
              <TabsContent value="changelog">
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                  {changelogs.map((log, index) => (
                    <motion.div
                      key={index}
                      variants={fadeUp}
                      className="rounded-2xl border border-border/40 bg-card/60 p-4"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="text-base font-bold">{log.version}</h3>
                        {log.subtitle && (
                          <span className="text-xs font-semibold text-primary">{log.subtitle}</span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {getExactChangelogDate(log)}
                        </span>
                      </div>

                      <ul className="mt-2 space-y-1.5">
                        {log.changes.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span
                              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHANGELOG_TYPE_CLASSES[change.type]}`}
                            >
                              {change.type}
                            </span>
                            <span className="leading-relaxed">{change.text}</span>
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
  );
}
