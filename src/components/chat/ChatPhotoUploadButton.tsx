"use client";

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

export default function ChatPhotoUploadButton({
  chatId,
  disabled = false,
  sendImageMessage,
  className,
}: {
  chatId: string;
  disabled?: boolean;
  sendImageMessage: (imageUrl: string) => void;
  className?: string;
}) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadChatImage = (file: File, index: number): Promise<string> => {
    const storagePath = `chats/${chatId}/${Date.now()}_${index}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: STORAGE_CACHE_CONTROL,
      });
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(error),
        async () => {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        },
      );
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !chatId || !currentUser) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please select image files.' });
      return;
    }
    if (imageFiles.length < files.length) {
      toast({
        variant: 'destructive',
        title: 'Some files skipped',
        description: 'Only image files were uploaded.',
      });
    }

    try {
      setIsUploading(true);
      for (let i = 0; i < imageFiles.length; i++) {
        const downloadURL = await uploadChatImage(imageFiles[i], i);
        sendImageMessage(downloadURL);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto px-4', className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      <Button
        type="button"
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="w-full h-12 rounded-2xl font-semibold text-micro-label gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.uploading}
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            {t.addPhotos}
          </>
        )}
      </Button>
    </div>
  );
}
