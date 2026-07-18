'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users,
  Lock,
} from 'lucide-react';
import { NavPageHeader, EmptyState, FeedCard } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CreateDocDialog } from '@/components/docs/CreateDocDialog';
import { useAuth } from '@/contexts/auth-context';
import { useDocs } from '@/hooks/use-docs';
import { useUsersById } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { formatAppDateTime, formatUserDisplayName, getAppLocale } from '@/lib/formatting';
import { toDateSafe } from '@/lib/firestore-timestamp';
import { stripHtmlPreview, displayDocTitle } from '@/lib/docs-utils';
import { getDocActionErrorMessage } from '@/lib/docs-errors';
import { translations } from '@/lib/translations';
import type { DocNote } from '@/types';

type FilterTab = 'all' | 'personal' | 'shared';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
};

function DocListItem({
  note,
  index,
  currentUserId,
  onOpen,
  onDelete,
  title,
  ownerLabel,
  updatedLabel,
  personalLabel,
  sharedLabel,
  deleteLabel,
  deleteConfirm,
  cancelLabel,
}: {
  note: DocNote;
  index: number;
  currentUserId: string;
  onOpen: () => void;
  onDelete: () => Promise<void>;
  title: string;
  ownerLabel: string;
  updatedLabel: string;
  personalLabel: string;
  sharedLabel: string;
  deleteLabel: string;
  deleteConfirm: string;
  cancelLabel: string;
}) {
  const isOwner = note.ownerId === currentUserId;
  const isShared = note.visibility === 'shared';

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <FeedCard className="p-0 overflow-hidden">
        <button
          type="button"
          onClick={onOpen}
          className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              {isShared ? (
                <Users className="h-4 w-4 text-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isShared ? sharedLabel : personalLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {stripHtmlPreview(note.content) || '—'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {ownerLabel} · {updatedLabel}
              </p>
            </div>
          </div>
        </button>
        {isOwner ? (
          <div className="flex justify-end border-t border-border/40 px-2 py-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {deleteLabel}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{deleteLabel}</AlertDialogTitle>
                  <AlertDialogDescription>{deleteConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">{cancelLabel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async (e) => {
                      e.preventDefault();
                      await onDelete();
                    }}
                  >
                    {deleteLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </FeedCard>
    </motion.div>
  );
}

export default function DocsPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const { toast } = useToast();
  const usersById = useUsersById();
  const { docs, loading, createDoc, deleteDocById } = useDocs(currentUser?.uid);
  const [tab, setTab] = useState<FilterTab>('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  const filtered = useMemo(() => {
    if (tab === 'personal') return docs.filter((d) => d.visibility === 'private');
    if (tab === 'shared') return docs.filter((d) => d.visibility === 'shared');
    return docs;
  }, [docs, tab]);

  if (loadingAuth || !currentUser) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <NavPageHeader
        description={t.docsDesc}
        action={
          <Button
            variant="primary"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t.newDocument}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="all">{t.docsFilterAll}</TabsTrigger>
          <TabsTrigger value="personal">{t.docsFilterPersonal}</TabsTrigger>
          <TabsTrigger value="shared">{t.docsFilterShared}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.noDocumentsYet}
          description={t.noDocumentsYetDesc}
        />
      ) : (
        <div className="stack-gap-sm">
          {filtered.map((note, index) => {
            const authorIds = note.authorIds?.length ? note.authorIds : [note.ownerId];
            const authorLabel = authorIds
              .slice(0, 3)
              .map((uid) =>
                uid === currentUser.uid
                  ? t.you
                  : formatUserDisplayName(usersById.get(uid), t.communityMember),
              )
              .join(', ');
            const createdLabel = formatAppDateTime(toDateSafe(note.createdAt), locale);
            const updatedLabel = formatAppDateTime(toDateSafe(note.updatedAt), locale);
            return (
              <DocListItem
                key={note.id}
                note={note}
                index={index}
                currentUserId={currentUser.uid}
                title={displayDocTitle(note.title, t.untitledDocument)}
                onOpen={() => router.push(`/docs/${note.id}`)}
                onDelete={async () => {
                  try {
                    await deleteDocById(note.id);
                    toast({ title: t.documentDeleted });
                  } catch (e: unknown) {
                    toast({
                      title: t.error,
                      description: getDocActionErrorMessage(e, t),
                      variant: 'destructive',
                    });
                  }
                }}
                ownerLabel={authorLabel}
                updatedLabel={`${createdLabel} · ${t.updated} ${updatedLabel}`}
                personalLabel={t.personalDocument}
                sharedLabel={t.sharedDocument}
                deleteLabel={t.deleteDocument}
                deleteConfirm={t.deleteDocumentConfirm}
                cancelLabel={t.cancel}
              />
            );
          })}
        </div>
      )}

      <CreateDocDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          try {
            const id = await createDoc(input);
            toast({ title: t.documentCreated });
            router.push(`/docs/${id}`);
          } catch (e: unknown) {
            toast({
              title: t.error,
              description: getDocActionErrorMessage(e, t),
              variant: 'destructive',
            });
            throw e;
          }
        }}
      />
    </div>
  );
}
