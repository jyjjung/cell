'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { FileText, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeletedContentNotice } from '@/components/chat/DeletedContentNotice';
import { useAuth } from '@/contexts/auth-context';
import { useUsersById } from '@/hooks/use-all-users';
import { translations } from '@/lib/translations';
import { displayDocTitle, stripHtmlPreview } from '@/lib/docs-utils';
import { isDocDeletedLocally } from '@/lib/docs-deleted';
import { formatAppDateTime, formatUserDisplayName, getAppLocale } from '@/lib/formatting';
import { toDateSafe } from '@/lib/firestore-timestamp';
import { db } from '@/lib/firebase';
import type { DocNote, DocVisibility } from '@/types';

interface DocSummaryProps {
  docId: string;
  isSender: boolean;
  /** When the document is gone, call so the parent can render an inline deleted notice. */
  onMissing?: () => void;
}

function noteFromSnapshot(snapshot: DocumentSnapshot): DocNote {
  const data = snapshot.data()!;
  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    content: (data.content as string) || '',
    visibility: (data.visibility as DocVisibility) || 'private',
    ownerId: data.ownerId as string,
    authorIds: Array.isArray(data.authorIds)
      ? (data.authorIds as string[])
      : [data.ownerId as string],
    sharedWith: Array.isArray(data.sharedWith) ? (data.sharedWith as string[]) : [],
    memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
    sourceChatIds: Array.isArray(data.sourceChatIds) ? (data.sourceChatIds as string[]) : [],
    createdAt: data.createdAt as DocNote['createdAt'],
    updatedAt: data.updatedAt as DocNote['updatedAt'],
    updatedBy: (data.updatedBy as string) || '',
  };
}

/** Offline fallback: show cached doc only if server never confirms in time. */
const CACHE_FALLBACK_MS = 1500;

export default function DocSummary({ docId, isSender, onMissing }: DocSummaryProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const usersById = useUsersById();
  const [note, setNote] = useState<DocNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (isDocDeletedLocally(docId)) {
      setNote(null);
      setMissing(true);
      setLoading(false);
      onMissing?.();
      return;
    }

    let cancelled = false;
    let cacheFallback: ReturnType<typeof setTimeout> | undefined;
    let pendingCacheNote: DocNote | null = null;

    setLoading(true);
    setMissing(false);
    setNote(null);

    const showDeleted = () => {
      if (cancelled) return;
      if (cacheFallback) {
        clearTimeout(cacheFallback);
        cacheFallback = undefined;
      }
      pendingCacheNote = null;
      setNote(null);
      setMissing(true);
      setLoading(false);
      onMissing?.();
    };

    const showNote = (next: DocNote) => {
      if (cancelled) return;
      if (cacheFallback) {
        clearTimeout(cacheFallback);
        cacheFallback = undefined;
      }
      pendingCacheNote = null;
      setNote(next);
      setMissing(false);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(
      doc(db, 'docs', docId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (cancelled) return;
        if (!snapshot.exists() || isDocDeletedLocally(docId)) {
          showDeleted();
          return;
        }

        const next = noteFromSnapshot(snapshot);

        // Server-confirmed existence — safe to show.
        if (!snapshot.metadata.fromCache) {
          showNote(next);
          return;
        }

        // From persistent cache only: don't flash content that may already be
        // deleted on the server. Wait briefly for a server snapshot; if we're
        // offline, fall back to the cached doc.
        pendingCacheNote = next;
        if (!cacheFallback) {
          cacheFallback = setTimeout(() => {
            if (cancelled || !pendingCacheNote) return;
            showNote(pendingCacheNote);
          }, CACHE_FALLBACK_MS);
        }
      },
      () => {
        showDeleted();
      },
    );

    return () => {
      cancelled = true;
      if (cacheFallback) clearTimeout(cacheFallback);
      unsubscribe();
    };
  }, [docId, onMissing]);

  const authorLabel = useMemo(() => {
    if (!note) return '';
    const ids = note.authorIds?.length ? note.authorIds : [note.ownerId];
    return ids
      .slice(0, 3)
      .map((uid) => formatUserDisplayName(usersById.get(uid), t.communityMember))
      .join(', ');
  }, [note, usersById, t.communityMember]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 text-micro-label font-medium text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  if (missing || !note) {
    // Parent MessageBubble renders the inline deleted notice when onMissing is set.
    if (onMissing) return null;
    return <DeletedContentNotice label={t.deletedContentDoc} />;
  }

  const title = displayDocTitle(note.title, t.untitledDocument);
  const preview = stripHtmlPreview(note.content, 100);
  const updated = formatAppDateTime(toDateSafe(note.updatedAt), locale);

  return (
    <Link href={`/docs/${docId}`} className="block transition-transform active:scale-95">
      <div
        className={cn(
          'group flex w-full max-w-full flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-200',
          isSender
            ? 'border-primary/30 bg-primary/5 text-foreground'
            : 'border-border/60 bg-card text-foreground',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
            <FileText className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-micro-label text-muted-foreground mb-0.5">{t.documentAttachment}</p>
            <h3 className="truncate text-base font-semibold leading-tight">{title}</h3>
            {preview ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview}</p>
            ) : null}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1 opacity-60 group-hover:opacity-100" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {authorLabel ? <span>{authorLabel}</span> : null}
          {updated ? <span>{updated}</span> : null}
          {note.visibility === 'shared' ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {t.sharedDocument}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
