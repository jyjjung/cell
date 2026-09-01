"use client";

import { useState, useEffect } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { motion } from 'framer-motion';
import { Link2, Plus, Trash2, ExternalLink, Pencil, Check } from 'lucide-react';
import { EmptyState, NavPageHeader } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy, updateDoc,
} from 'firebase/firestore';
import { RemoteImage } from '@/components/ui/remote-image';
import type { CommunityLink } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const LINKS_COLLECTION = 'communityLinks';

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
  const t = translations[currentUser?.preferredLanguage || 'en'];
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
        toast({ title: t.linkUpdated });
      } else {
        await addDoc(collection(db, LINKS_COLLECTION), {
          title: title.trim(),
          url: finalUrl,
          description: desc.trim() || null,
          createdBy: currentUser!.uid,
          createdAt: serverTimestamp(),
        });
        toast({ title: t.linkAdded });
      }
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-xl p-5 border-border/50 bg-card max-w-sm">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-section-title">
            {existing ? t.editLink : t.addLink}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {existing ? t.editLink : t.addLink}
          </DialogDescription>
        </DialogHeader>
        <div className="stack-gap-sm mt-3">
          <div className="stack-gap-sm">
            <Label htmlFor="link-title">{t.titleLabel} <span className="text-primary">*</span></Label>
            <Input id="link-title" placeholder={t.linkTitlePlaceholder} value={title}
              onChange={e => setTitle(e.target.value)} className="rounded-lg" />
          </div>
          <div className="stack-gap-sm">
            <Label htmlFor="link-url">URL <span className="text-primary">*</span></Label>
            <Input id="link-url" placeholder="https://example.com" value={url}
              onChange={e => setUrl(e.target.value)} className="rounded-lg"
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="stack-gap-sm">
            <Label htmlFor="link-desc">{t.details}</Label>
            <Input id="link-desc" placeholder={t.linkDescPlaceholder} value={desc}
              onChange={e => setDesc(e.target.value)} className="rounded-lg" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-lg" onClick={onClose}>{t.cancel}</Button>
            <Button variant="primary" className="flex-1 rounded-lg"
              onClick={handleSave} disabled={!title.trim() || !url.trim() || saving}>
              {saving ? <ButtonSpinner className="mr-2" /> : null}
              {existing ? t.save : t.addLink}
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
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { toast } = useToast();
  const [links, setLinks]     = useState<CommunityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editLink, setEditLink] = useState<CommunityLink | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CommunityLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLinks([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, LINKS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityLink)));
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [currentUser?.uid]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, LINKS_COLLECTION, deleteConfirm.id));
      toast({ title: t.linkRemoved });
      setDeleteConfirm(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <NavPageHeader
          action={
            isAdmin ? (
              <div className="flex items-center gap-2">
                {editMode && (
                  <Button
                    className="h-8 rounded-lg gap-1.5 px-3 text-sm"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> {t.addLink}
                  </Button>
                )}
                <Button
                  variant={editMode ? "default" : "outline"}
                  className="h-8 rounded-lg gap-1.5 px-3 text-sm"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? (
                    <>
                      <Check className="h-4 w-4" /> {t.doneEditing}
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" /> {t.editMode}
                    </>
                  )}
                </Button>
              </div>
            ) : undefined
          }
        />
      </motion.div>

      {loading ? (
        <ListLoadingSkeleton />
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={t.noLinksYet}
          description={isAdmin && editMode ? t.addFirstLink : undefined}
        />
      ) : (
        <div className="admin-table-wrap page-responsive-table">
          <Table className="admin-table">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead>{t.titleLabel}</TableHead>
                <TableHead>{t.details}</TableHead>
                {isAdmin && editMode ? (
                  <TableHead className="text-right">{t.adminActions}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const favicon = faviconUrl(link.url);
                return (
                  <TableRow key={link.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="responsive-table-primary py-2 whitespace-normal">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2.5 min-w-0"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                          {favicon ? (
                            <RemoteImage
                              src={favicon}
                              alt=""
                              width={16}
                              height={16}
                              className="h-4 w-4 object-contain"
                              sizes="16px"
                            />
                          ) : (
                            <Link2 className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words group-hover:text-primary transition-colors">
                            {link.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground break-all">{hostname(link.url)}</p>
                        </div>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.details}>
                      <span className="text-sm text-muted-foreground break-words">
                        {link.description || '—'}
                      </span>
                    </TableCell>
                    {isAdmin && editMode ? (
                      <TableCell className="py-2 whitespace-normal text-right" data-label={t.adminActions}>
                        <div className="flex justify-end gap-1">
                          <IconButton
                            aria-label={t.editLink}
                            icon={Pencil}
                            variant="outline"
                            onClick={() => setEditLink(link)}
                          />
                          <IconButton
                            aria-label={t.removeLink}
                            icon={Trash2}
                            variant="outline"
                            onClick={() => setDeleteConfirm(link)}
                            className="hover:text-destructive"
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddEditLinkDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AddEditLinkDialog open={!!editLink} existing={editLink} onClose={() => setEditLink(null)} />

      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-xl border-border/50 bg-card p-5">
          <DialogHeader>
            <DialogTitle className="text-section-title">Remove &quot;{deleteConfirm?.title}&quot;?</DialogTitle>
            <DialogDescription>{t.removeLinkConfirm}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setDeleteConfirm(null)}>{t.cancel}</Button>
            <Button variant="destructive" className="flex-1 rounded-lg" onClick={handleDelete} disabled={deleting}>
              {deleting ? <ButtonSpinner className="mr-2" /> : null} {t.removeLink}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
