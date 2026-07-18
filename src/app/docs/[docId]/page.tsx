'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Share2,
  Trash2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DocEditor } from '@/components/docs/DocEditor';
import { DocComments } from '@/components/docs/DocComments';
import { ShareDocDialog } from '@/components/docs/ShareDocDialog';
import { useAuth } from '@/contexts/auth-context';
import { useDoc } from '@/hooks/use-docs';
import { useToast } from '@/hooks/use-toast';
import { translations } from '@/lib/translations';
import type { DocVisibility } from '@/types';

const AUTOSAVE_MS = 800;

export default function DocDetailPage() {
  const params = useParams();
  const docId = typeof params?.docId === 'string' ? params.docId : undefined;
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { toast } = useToast();
  const {
    note,
    loading,
    error,
    saving,
    isOwner,
    saveContent,
    updateSharing,
    removeDoc,
  } = useDoc(docId, currentUser?.uid);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [shareOpen, setShareOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  useEffect(() => {
    if (!note) return;
    if (hydratedId.current !== note.id) {
      setTitle(note.title);
      setContent(note.content || '<p></p>');
      setDirty(false);
      hydratedId.current = note.id;
      return;
    }
    if (!dirty) {
      setTitle(note.title);
      setContent(note.content || '<p></p>');
    }
  }, [note, dirty]);

  useEffect(() => {
    if (!dirty || !note || !currentUser) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveContent(title, content);
        setDirty(false);
      } catch (e: unknown) {
        toast({
          title: t.error,
          description: e instanceof Error ? e.message : undefined,
          variant: 'destructive',
        });
      }
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, content, dirty, note, currentUser, saveContent, toast, t.error]);

  if (loadingAuth || !currentUser || loading) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="page-container stack-gap-sm">
        <Button
          variant="ghost"
          className="h-8 rounded-lg w-fit"
          onClick={() => router.push('/docs')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>
        <p className="text-sm text-muted-foreground">{error?.message || t.documentNotFound}</p>
      </div>
    );
  }

  const markDirtyTitle = (value: string) => {
    setTitle(value);
    setDirty(true);
  };

  const markDirtyContent = (html: string) => {
    setContent(html);
    setDirty(true);
  };

  return (
    <div className="page-container max-w-5xl">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg"
          onClick={() => router.push('/docs')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mr-1">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t.saving}
            </>
          ) : dirty ? (
            t.unsavedChanges
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              {t.saved}
            </>
          )}
        </span>
        {isOwner ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              {t.shareSettings}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t.deleteDocument}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteDocument}</AlertDialogTitle>
                  <AlertDialogDescription>{t.deleteDocumentConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await removeDoc();
                        toast({ title: t.documentDeleted });
                        router.push('/docs');
                      } catch (err: unknown) {
                        toast({
                          title: t.error,
                          description: err instanceof Error ? err.message : undefined,
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    {t.deleteDocument}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>

      <Input
        value={title}
        onChange={(e) => markDirtyTitle(e.target.value.slice(0, 200))}
        className="text-xl font-semibold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 mb-3 h-auto"
        placeholder={t.documentTitlePlaceholder}
        maxLength={200}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <DocEditor
          content={content}
          onChange={markDirtyContent}
          placeholder={t.documentEditorPlaceholder}
        />
        {note.visibility === 'shared' ? (
          <DocComments docId={note.id} ownerId={note.ownerId} />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card px-4 py-5 text-sm text-muted-foreground h-fit">
            {t.commentsPrivateHint}
          </div>
        )}
      </div>

      {isOwner ? (
        <ShareDocDialog
          open={shareOpen}
          note={note}
          onClose={() => setShareOpen(false)}
          onSave={async (visibility: DocVisibility, sharedWith: string[]) => {
            try {
              await updateSharing(visibility, sharedWith);
              toast({ title: t.shareSettingsSaved });
            } catch (e: unknown) {
              toast({
                title: t.error,
                description: e instanceof Error ? e.message : undefined,
                variant: 'destructive',
              });
              throw e;
            }
          }}
        />
      ) : null}
    </div>
  );
}
