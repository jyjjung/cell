'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Share2,
  Trash2,
  Check,
  Save,
  RefreshCw,
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
import { useUsersById } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeAppTime, formatUserDisplayName, getAppLocale } from '@/lib/formatting';
import { toDateSafe, toMillisSafe } from '@/lib/firestore-timestamp';
import { isBlankDocHtml } from '@/lib/docs-utils';
import { getDocActionErrorMessage } from '@/lib/docs-errors';
import { translations } from '@/lib/translations';
import type { DocVisibility } from '@/types';

const AUTOSAVE_MS = 800;
const RELATIVE_TIME_TICK_MS = 30000;

export default function DocDetailPage() {
  const params = useParams();
  const docId = typeof params?.docId === 'string' ? params.docId : undefined;
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const usersById = useUsersById();
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
  const [manualSaving, setManualSaving] = useState(false);
  /** Editor stays unmounted until local draft matches the loaded note. */
  const [hydrated, setHydrated] = useState(false);
  /** Remote changes from someone else while local draft is dirty. */
  const [remoteNewer, setRemoteNewer] = useState(false);
  /** Highlight inserted text when applying someone else's live edit. */
  const [highlightRemote, setHighlightRemote] = useState(false);
  const [titleRemoteFlash, setTitleRemoteFlash] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedId = useRef<string | null>(null);
  const userEditedRef = useRef(false);
  const appliedUpdatedAtRef = useRef(0);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  titleRef.current = title;
  contentRef.current = content;

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), RELATIVE_TIME_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    hydratedId.current = null;
    appliedUpdatedAtRef.current = 0;
    setHydrated(false);
    setDirty(false);
    setRemoteNewer(false);
    setHighlightRemote(false);
    setTitleRemoteFlash(false);
    userEditedRef.current = false;
    setTitle('');
    setContent('<p></p>');
  }, [docId]);

  useEffect(() => {
    if (!note) return;
    const remoteTitle = note.title;
    const remoteContent = note.content || '<p></p>';
    const remoteMs = toMillisSafe(note.updatedAt);

    if (hydratedId.current !== note.id) {
      setTitle(remoteTitle);
      setContent(remoteContent);
      setDirty(false);
      setRemoteNewer(false);
      setHighlightRemote(false);
      setTitleRemoteFlash(false);
      userEditedRef.current = false;
      hydratedId.current = note.id;
      appliedUpdatedAtRef.current = remoteMs;
      setHydrated(true);
      return;
    }

    const contentDiffers =
      remoteTitle !== titleRef.current || remoteContent !== contentRef.current;
    const isRemoteFromOther =
      !!note.updatedBy && note.updatedBy !== currentUser?.uid;

    // Live-sync remote changes immediately when the local draft is clean.
    if (!dirty && !userEditedRef.current) {
      if (contentDiffers) {
        const titleChanged = remoteTitle !== titleRef.current;
        const bodyChanged = remoteContent !== contentRef.current;
        setHighlightRemote(isRemoteFromOther && bodyChanged);
        setTitleRemoteFlash(isRemoteFromOther && titleChanged);
        setTitle(remoteTitle);
        setContent(remoteContent);
      } else {
        setHighlightRemote(false);
      }
      appliedUpdatedAtRef.current = Math.max(appliedUpdatedAtRef.current, remoteMs);
      setRemoteNewer(false);
      return;
    }

    // Local edits in progress — surface a reload prompt when someone else saved.
    if (
      isRemoteFromOther &&
      contentDiffers &&
      remoteMs > appliedUpdatedAtRef.current
    ) {
      setRemoteNewer(true);
    }
  }, [note, dirty, currentUser?.uid]);

  useEffect(() => {
    if (!titleRemoteFlash) return;
    const id = window.setTimeout(() => setTitleRemoteFlash(false), 3800);
    return () => window.clearTimeout(id);
  }, [titleRemoteFlash]);

  useEffect(() => {
    if (!highlightRemote) return;
    const id = window.setTimeout(() => setHighlightRemote(false), 4000);
    return () => window.clearTimeout(id);
  }, [highlightRemote]);

  useEffect(() => {
    if (!dirty || !hydrated || !note || !currentUser || !userEditedRef.current) return;
    // Never autosave empty local content over non-empty server content.
    if (isBlankDocHtml(content) && !isBlankDocHtml(note.content)) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const nextTitle = titleRef.current;
      const nextContent = contentRef.current;
      if (isBlankDocHtml(nextContent) && !isBlankDocHtml(note.content)) return;
      try {
        await saveContent(nextTitle, nextContent);
        setDirty(false);
        userEditedRef.current = false;
        setRemoteNewer(false);
        appliedUpdatedAtRef.current = Date.now();
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
  }, [title, content, dirty, hydrated, note, currentUser, saveContent, toast, t.error]);

  const applyRemoteVersion = () => {
    if (!note) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const titleChanged = note.title !== titleRef.current;
    const bodyChanged = (note.content || '<p></p>') !== contentRef.current;
    setHighlightRemote(bodyChanged);
    setTitleRemoteFlash(titleChanged);
    setTitle(note.title);
    setContent(note.content || '<p></p>');
    setDirty(false);
    setRemoteNewer(false);
    userEditedRef.current = false;
    appliedUpdatedAtRef.current = toMillisSafe(note.updatedAt);
  };

  const lastEditorName = useMemo(() => {
    if (!note) return '';
    const editorId = note.updatedBy || note.ownerId;
    if (editorId === currentUser?.uid) return t.you;
    return formatUserDisplayName(usersById.get(editorId), t.communityMember);
  }, [note, currentUser?.uid, usersById, t.you, t.communityMember]);

  const metaLine = useMemo(() => {
    if (!note) return '';
    const editedBy =
      (note.updatedBy || note.ownerId) === currentUser?.uid
        ? t.editedByYou
        : t.editedByOther.replace('{name}', lastEditorName);
    const when = formatRelativeAppTime(toDateSafe(note.updatedAt), locale, new Date(nowTick));
    return `${editedBy} · ${when}`;
  }, [
    note,
    currentUser?.uid,
    lastEditorName,
    t.editedByYou,
    t.editedByOther,
    locale,
    nowTick,
  ]);

  const remoteBannerText = useMemo(() => {
    if (!note) return t.documentUpdatedByOther;
    const name =
      note.updatedBy === currentUser?.uid
        ? t.you
        : formatUserDisplayName(usersById.get(note.updatedBy), t.communityMember);
    return t.documentUpdatedByName.replace('{name}', name);
  }, [
    note,
    currentUser?.uid,
    usersById,
    t.documentUpdatedByOther,
    t.documentUpdatedByName,
    t.you,
    t.communityMember,
  ]);

  const handleManualSave = async () => {
    if (!note || !currentUser || !hydrated) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setManualSaving(true);
    try {
      await saveContent(title, content, { allowEmpty: isBlankDocHtml(content) });
      setDirty(false);
      userEditedRef.current = false;
      setRemoteNewer(false);
      appliedUpdatedAtRef.current = Date.now();
      toast({ title: t.saved });
    } catch (e: unknown) {
      toast({
        title: t.error,
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setManualSaving(false);
    }
  };

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
        <p className="text-sm text-muted-foreground">
          {error ? getDocActionErrorMessage(error, t) : t.documentNotFound}
        </p>
      </div>
    );
  }

  const markDirtyTitle = (value: string) => {
    if (!hydrated) return;
    userEditedRef.current = true;
    setTitle(value);
    setDirty(true);
  };

  const markDirtyContent = (html: string) => {
    if (!hydrated) return;
    if (html === contentRef.current) return;
    userEditedRef.current = true;
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
          {saving || manualSaving ? (
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
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg"
          onClick={() => void handleManualSave()}
          disabled={manualSaving || saving || !dirty}
        >
          {manualSaving ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          {t.save}
        </Button>
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
        className={`text-xl font-semibold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-auto rounded-md transition-[background-color] duration-500 ${
          titleRemoteFlash ? 'doc-remote-title-flash px-1.5 -mx-1.5' : ''
        }`}
        placeholder={t.documentTitlePlaceholder}
        maxLength={200}
        disabled={!hydrated}
      />
      <p className="text-xs text-muted-foreground mb-3 mt-1">{metaLine}</p>

      {remoteNewer ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
          <span className="flex-1 text-muted-foreground">{remoteBannerText}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={applyRemoteVersion}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t.loadLatestDocument}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {hydrated ? (
          <DocEditor
            key={note.id}
            content={content}
            onChange={markDirtyContent}
            placeholder={t.documentEditorPlaceholder}
            acceptUpdates={hydrated}
            highlightRemoteChanges={highlightRemote}
          />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card min-h-[320px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
          </div>
        )}
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
