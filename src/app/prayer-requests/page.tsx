"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { PageLoading, LoadingSpinner } from '@/components/ui/loading-spinner';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { SwitchRow } from '@/components/ui/switch-row';
import { NavPageHeader, EmptyState, FeedCard } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/contexts/auth-context';
import { usePrayerRequests } from '@/hooks/use-prayer-requests';
import { useToast } from '@/hooks/use-toast';
import { formatAppDateTime, getAppLocale } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { toDateSafe } from '@/lib/firestore-timestamp';
import type { PrayerRequest } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function PrayerRequestItem({
  item,
  index,
  isShepherd,
  currentUserId,
  locale,
  onUpdate,
  onDelete,
}: {
  item: PrayerRequest;
  index: number;
  isShepherd: boolean;
  currentUserId: string;
  locale: 'en' | 'ko';
  onUpdate: (id: string, text: string, isAnonymous: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const canManage = item.submitterId === currentUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editAnonymous, setEditAnonymous] = useState(item.isAnonymous);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createdAt = toDateSafe(item.createdAt);
  const authorLabel = isShepherd
    ? (item.isAnonymous ? 'Anonymous' : (item.submitterDisplayName || 'Member'))
    : (item.isAnonymous ? 'Submitted anonymously' : 'Submitted with your name');

  const handleSave = async () => {
    if (!editText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onUpdate(item.id, editText, editAnonymous);
      setIsEditing(false);
      toast({ title: 'Prayer request updated' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not update request';
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
      toast({ title: 'Prayer request deleted' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not delete request';
      toast({ variant: 'destructive', title: 'Delete failed', description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <FeedCard key={item.id} index={index} className="p-4 space-y-3">
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[120px] resize-none rounded-xl"
            maxLength={2000}
          />
          <SwitchRow
            id={`anonymous-${item.id}`}
            label="Submit anonymously"
            description={
              editAnonymous ? 'Shepherd Claire will not see your name' : 'Your name will be shown to Claire'
            }
            checked={editAnonymous}
            onCheckedChange={setEditAnonymous}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              disabled={isSaving}
              onClick={() => {
                setEditText(item.text);
                setEditAnonymous(item.isAnonymous);
                setIsEditing(false);
              }}
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="rounded-xl"
              disabled={!editText.trim() || isSaving}
              onClick={handleSave}
            >
              {isSaving ? <LoadingSpinner size="sm" className="mr-1.5" /> : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{authorLabel}</span>
            <span>{formatAppDateTime(createdAt, locale)}</span>
          </div>
          {canManage && (
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 px-2.5"
                onClick={() => {
                  setEditText(item.text);
                  setEditAnonymous(item.isAnonymous);
                  setIsEditing(true);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-8 px-2.5 text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <LoadingSpinner size="sm" className="mr-1.5" /> : (
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this prayer request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. Shepherd Claire will no longer see this request.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </>
      )}
    </FeedCard>
  );
}

export default function PrayerRequestsPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const {
    requests,
    loading,
    isShepherd,
    markShepherdSeen,
    submitRequest,
    updateRequest,
    deleteRequest,
  } = usePrayerRequests();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  useEffect(() => {
    if (isShepherd && !loading) {
      void markShepherdSeen();
    }
  }, [isShepherd, loading, markShepherdSeen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitRequest(text, isAnonymous);
      setText('');
      setIsAnonymous(false);
      toast({
        title: 'Prayer request sent',
        description: 'Shepherd Claire will receive your request privately.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not submit request';
      toast({ variant: 'destructive', title: 'Submission failed', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth || !currentUser) {
    return <PageLoading className="page-container min-h-[40vh]" />;
  }

  return (
    <div className="page-container">
      <NavPageHeader description={t.prayerRequestsDesc} />

      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <FeedCard className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Prayer Request</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="What would you like us to pray for?"
              className="min-h-[140px] resize-none rounded-xl"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
            />

            <SwitchRow
              id="anonymous-prayer"
              label="Submit anonymously"
              description={
                isAnonymous ? 'Shepherd Claire will not see your name' : 'Your name will be shown to Claire'
              }
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!text.trim() || isSubmitting} className="rounded-xl">
                {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Submit
              </Button>
            </div>
          </form>
        </FeedCard>
      </motion.div>

      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">
          {isShepherd ? 'All prayer requests' : 'Your prayer requests'}
        </h3>

        {loading ? (
          <ListLoadingSkeleton rows={3} />
        ) : requests.length === 0 ? (
          <EmptyState
            title={isShepherd ? 'No requests yet' : 'No requests submitted yet'}
            description={
              isShepherd
                ? 'When members submit prayer requests, they will appear here.'
                : 'Your submitted requests will appear here for your reference.'
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((item, index) => (
              <PrayerRequestItem
                key={item.id}
                item={item}
                index={index}
                isShepherd={isShepherd}
                currentUserId={currentUser.uid}
                locale={locale}
                onUpdate={updateRequest}
                onDelete={deleteRequest}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
