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
import {
  chatCardEyebrow,
  chatCardLoading,
  chatCardMeta,
  chatCardShell,
  chatCardTitle,
} from './chat-card-styles';

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

type DocSnapHandler = (snapshot: DocumentSnapshot | null, errored?: boolean) => void;

type SharedDocListener = {
  refCount: number;
  unsub: () => void;
  subscribers: Set<DocSnapHandler>;
};

/** One Firestore listener per docId shared across DocSummary instances. */
const sharedDocListeners = new Map<string, SharedDocListener>();

function subscribeSharedDoc(docId: string, handler: DocSnapHandler): () => void {
  let entry = sharedDocListeners.get(docId);
  if (!entry) {
    const subscribers = new Set<DocSnapHandler>();
    const unsub = onSnapshot(
      doc(db, 'docs', docId),
      { includeMetadataChanges: true },
      (snapshot) => {
        subscribers.forEach((cb) => cb(snapshot));
      },
      () => {
        subscribers.forEach((cb) => cb(null, true));
      },
    );
    entry = { refCount: 0, unsub, subscribers };
    sharedDocListeners.set(docId, entry);
  }
  entry.subscribers.add(handler);
  entry.refCount += 1;

  return () => {
    const current = sharedDocListeners.get(docId);
    if (!current) return;
    current.subscribers.delete(handler);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      current.unsub();
      sharedDocListeners.delete(docId);
    }
  };
}

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

    const unsubscribe = subscribeSharedDoc(docId, (snapshot, errored) => {
      if (cancelled) return;
      if (errored || !snapshot) {
        showDeleted();
        return;
      }
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
    });

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
    return <div className={chatCardLoading}>{t.loading}</div>;
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
      <div className={chatCardShell(isSender, 'max-w-[280px]')}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-muted">
            <FileText className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(chatCardEyebrow, 'mb-0.5')}>{t.documentAttachment}</p>
            <h3 className={chatCardTitle}>{title}</h3>
            {preview ? (
              <p className={cn(chatCardMeta, 'mt-1 line-clamp-2')}>{preview}</p>
            ) : null}
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
