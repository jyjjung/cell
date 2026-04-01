"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, Trash2, ExternalLink, Loader2, Pencil, Save, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy, updateDoc,
} from 'firebase/firestore';
import type { CommunityLink } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const LINKS_COLLECTION = 'communityLinks';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ── Hostname helper ───────────────────────────────────────────────────────────
function hostname(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function faviconUrl(url: string) {
  try { const { origin } = new URL(url); return `https://www.google.com/s2/favicons?sz=64&domain=${origin}`; }
  catch { return null; }
}

// ── AddEditLinkDialog ─────────────────────────────────────────────────────────
function AddEditLinkDialog({
  open, existing, onClose,
}: { open: boolean; existing?: CommunityLink | null; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title || '');
  const [url, setUrl]     = useState(existing?.url || '');
  const [desc, setDesc]   = useState(existing?.description || '');
  const [saving, setSaving] = useState(false);

  // Reset fields when dialog opens for new or different item
  useEffect(() => {
    setTitle(existing?.title || '');
    setUrl(existing?.url || '');
    setDesc(existing?.description || '');
  }, [existing, open]);

  const ensureHttps = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleSave = async () => {
    const finalUrl = ensureHttps(url);
    if (!title.trim() || !finalUrl) return;
    setSaving(true);
    try {
      if (existing) {
        await updateDoc(doc(db, LINKS_COLLECTION, existing.id), {
          title: title.trim(),
          url: finalUrl,
          description: desc.trim() || null,
        });
        toast({ title: 'Link updated' });
      } else {
        await addDoc(collection(db, LINKS_COLLECTION), {
          title: title.trim(),
          url: finalUrl,
          description: desc.trim() || null,
          createdBy: currentUser!.uid,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Link added' });
      }
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black normal-case not-italic tracking-tight">
            {existing ? 'Edit Link' : 'Add Link'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {existing ? 'Update the link details below.' : 'Add a new link for the community.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="link-title">Title <span className="text-rose-500">*</span></Label>
            <Input id="link-title" placeholder="e.g. Church Website" value={title}
              onChange={e => setTitle(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL <span className="text-rose-500">*</span></Label>
            <Input id="link-url" placeholder="https://example.com" value={url}
              onChange={e => setUrl(e.target.value)} className="rounded-xl"
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-desc">Description</Label>
            <Input id="link-desc" placeholder="Short description (optional)" value={desc}
              onChange={e => setDesc(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-violet-500 hover:bg-violet-600"
              onClick={handleSave} disabled={!title.trim() || !url.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {existing ? 'Save' : 'Add Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LinksPage() {
  const { currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [links, setLinks]     = useState<CommunityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editLink, setEditLink] = useState<CommunityLink | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CommunityLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, LINKS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityLink)));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, LINKS_COLLECTION, deleteConfirm.id));
      toast({ title: 'Link removed' });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  return (
    <div className="relative space-y-8 pb-32 max-w-4xl mx-auto px-4 md:px-8 mt-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="Links"
          description="A curated collection of useful links for the community."
          icon={Link2}
          accentColor="text-violet-500"
          iconBgColor="bg-violet-500/20"
        />
      </motion.div>

      {/* Admin add button */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex justify-end">
          <Button className="rounded-xl bg-violet-500 hover:bg-violet-600 h-10 gap-2"
            onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Link
          </Button>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : links.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-border/40 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">No links yet</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground/60 mt-1">Add your first link using the button above.</p>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {links.map((link, i) => {
            const favicon = faviconUrl(link.url);
            return (
              <motion.div key={link.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="group relative rounded-3xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-violet-500/30 transition-all overflow-hidden">
                {/* Clickable area */}
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-4 p-5 pr-16">
                  {/* Favicon */}
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {favicon ? (
                      <img src={favicon} alt="" className="w-6 h-6 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Link2 className="h-4 w-4 text-violet-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate group-hover:text-violet-500 transition-colors">
                      {link.title}
                    </p>
                    {link.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 font-medium">
                        {link.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/40 font-mono mt-1.5 truncate">
                      {hostname(link.url)}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-violet-500 transition-colors shrink-0 mt-0.5" />
                </a>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.preventDefault(); setEditLink(link); }}
                      className="p-1.5 rounded-lg bg-background/80 border border-border/50 hover:text-violet-500 hover:border-violet-500/40 transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={e => { e.preventDefault(); setDeleteConfirm(link); }}
                      className="p-1.5 rounded-lg bg-background/80 border border-border/50 hover:text-red-500 hover:border-red-500/40 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <AddEditLinkDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AddEditLinkDialog open={!!editLink} existing={editLink} onClose={() => setEditLink(null)} />

      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="rounded-3xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black normal-case not-italic">Remove "{deleteConfirm?.title}"?</DialogTitle>
            <DialogDescription>This link will be removed for everyone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
