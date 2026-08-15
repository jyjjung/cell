'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useCollection, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { Photo } from '@/types/ndcpc-ported';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ndcpc/LoadingState';
import { EmptyState } from '@/components/ndcpc/EmptyState';
import { CachedPhoto } from '@/components/ndcpc/CachedPhoto';
import { DATA_CACHE_KEYS } from '@/lib/ndcpc/data-cache';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/LocaleProvider';

export function PhotoGallery() {
  const { user, profile } = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [captionDialog, setCaptionDialog] = useState<{ photoId: string; caption: string } | null>(
    null
  );
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const photosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.photos), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: photos, isLoading } = useCollection<Photo>(photosQuery, {
    cacheKey: DATA_CACHE_KEYS.photos,
  });

  const handleUpload = async (files: File[]) => {
    if (!firestore || !storage || !user || !profile || files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadResults = await Promise.all(
        imageFiles.map(async (file, index) => {
          const storagePath = `photos/${user.uid}/${Date.now()}-${index}-${file.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(storageRef);

          const docRef = await addDoc(collection(firestore, NDCPc_COLLECTIONS.photos), {
            storagePath,
            downloadUrl,
            uploadedBy: user.uid,
            uploadedByName: profile.displayName,
            caption: '',
            createdAt: serverTimestamp(),
          });

          return { file, photoId: docRef.id };
        })
      );

      if (fileInputRef.current) fileInputRef.current.value = '';

      if (uploadResults.length === 1) {
        setCaptionDialog({ photoId: uploadResults[0]!.photoId, caption: '' });
        toast({ title: t('photos.uploaded') });
      } else {
        toast({
          title: t('photos.uploadedMultiple', { count: uploadResults.length }),
        });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    } finally {
      setIsUploading(false);
    }
  };

  const saveCaption = async () => {
    if (!firestore || !captionDialog) return;

    setIsSavingCaption(true);
    try {
      await updateDoc(doc(firestore, NDCPc_COLLECTIONS.photos, captionDialog.photoId), {
        caption: captionDialog.caption.trim(),
      });
      setCaptionDialog(null);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!firestore || !storage || !user || photo.uploadedBy !== user.uid) return;

    setDeletingPhotoId(photo.id);
    try {
      if (photo.storagePath) {
        await deleteObject(ref(storage, photo.storagePath));
      }
      await deleteDoc(doc(firestore, NDCPc_COLLECTIONS.photos, photo.id));
      toast({ title: t('photos.deleted') });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntDelete') });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void handleUpload(files);
            }}
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('photos.add')}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {!photos || photos.length === 0 ? (
          <EmptyState message={t('photos.empty')} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {photos.map((photo) => (
              <CachedPhoto
                key={photo.id}
                url={photo.downloadUrl}
                alt={photo.caption || photo.uploadedByName}
                filename={`${photo.caption || photo.id}.jpg`}
                canDelete={photo.uploadedBy === user?.uid}
                onDelete={() => void handleDelete(photo)}
                isDeleting={deletingPhotoId === photo.id}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!captionDialog}
        onOpenChange={(open) => {
          if (!open) setCaptionDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('photos.addCaptionTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={captionDialog?.caption ?? ''}
            onChange={(e) =>
              setCaptionDialog((current) =>
                current ? { ...current, caption: e.target.value } : current
              )
            }
            placeholder={t('photos.captionPlaceholder')}
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCaptionDialog(null)}>
              {t('photos.skipCaption')}
            </Button>
            <Button onClick={() => void saveCaption()} disabled={isSavingCaption}>
              {isSavingCaption ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
