"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { deleteStorageObjectAtUrl } from '@/lib/avatar-storage';
import getCroppedImg, { loadImageSrcForCrop } from '@/lib/cropImage';
import { storage } from '@/lib/firebase';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import { createDefaultNdcpcAvatar, sanitizeNdcpcAvatar } from '@/lib/user-avatars';
import type { AvatarData } from '@/types';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';

type NdcpcPhotoAvatarEditorProps = {
  value: AvatarData;
  onChange: (avatar: AvatarData) => void;
};

export function NdcpcPhotoAvatarEditor({ value, onChange }: NdcpcPhotoAvatarEditorProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const current = sanitizeNdcpcAvatar(value, {
    uid: currentUser?.uid,
    firstName: currentUser?.firstName,
    lastName: currentUser?.lastName,
  });
  const hasPhoto = current.mode === 'image' && Boolean(current.imageUrl);

  const clearCropSrc = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const openCropperWithSrc = useCallback((src: string, revokeBlob = false) => {
    if (blobUrlRef.current && blobUrlRef.current !== src) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (revokeBlob && src.startsWith('blob:')) {
      blobUrlRef.current = src;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageSrc(src);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please choose an image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result?.toString();
      if (result) openCropperWithSrc(result);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAdjustExisting = async () => {
    if (!current.imageUrl) return;
    setIsLoadingExisting(true);
    try {
      const src = await loadImageSrcForCrop(current.imageUrl);
      openCropperWithSrc(src, true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not open this photo for editing.';
      toast({ variant: 'destructive', title: 'Adjust failed', description: message });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !currentUser?.uid) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (!croppedImageBlob) throw new Error('Failed to crop image');

      const previousImageUrl = current.imageUrl;
      const storagePath = `avatars/ndcpc_${currentUser.uid}_${Date.now()}_cropped.jpg`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, croppedImageBlob, {
        contentType: croppedImageBlob.type || 'image/jpeg',
        cacheControl: STORAGE_CACHE_CONTROL,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        (error) => {
          setIsUploading(false);
          toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onChange(sanitizeNdcpcAvatar({ mode: 'image', imageUrl: downloadURL }));
          if (previousImageUrl && previousImageUrl !== downloadURL) {
            await deleteStorageObjectAtUrl(previousImageUrl);
          }
          setIsUploading(false);
          clearCropSrc();
        },
      );
    } catch (error: unknown) {
      setIsUploading(false);
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    }
  };

  const handleUseDefault = async () => {
    if (current.imageUrl) {
      await deleteStorageObjectAtUrl(current.imageUrl);
    }
    onChange(
      createDefaultNdcpcAvatar({
        uid: currentUser?.uid,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
      }),
    );
  };

  if (imageSrc) {
    return (
      <div className="flex flex-col h-[300px] md:h-[400px] gap-4 w-full max-w-md mx-auto">
        <div className="relative flex-1 rounded-2xl overflow-hidden bg-black w-full min-h-[200px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="flex items-center gap-4 px-2">
          <span className="text-xs font-semibold text-muted-foreground">Zoom</span>
          <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(val) => setZoom(val[0])} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={clearCropSrc} disabled={isUploading} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading} className="flex-1 rounded-xl font-semibold relative overflow-hidden">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                <span className="relative z-10">Uploading {Math.round(uploadProgress)}%</span>
              </>
            ) : (
              'Save photo'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="h-28 w-28">
        <PixelAvatar
          avatar={current}
          showHalo={false}
          className="h-28 w-28"
          nameHint={{ firstName: currentUser?.firstName, lastName: currentUser?.lastName }}
        />
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {hasPhoto
          ? 'Adjust framing, replace the photo, or use the default grey letter avatar.'
          : 'Upload a profile photo, or use the default grey letter avatar. Custom pixel styles are not available for NDC Preschool.'}
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {hasPhoto ? (
          <Button onClick={() => void handleAdjustExisting()} disabled={isLoadingExisting} className="rounded-xl">
            {isLoadingExisting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crop className="mr-2 h-4 w-4" />
            )}
            Adjust photo
          </Button>
        ) : null}
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant={hasPhoto ? 'outline' : 'default'}
          className="rounded-xl"
        >
          <Upload className="mr-2 h-4 w-4" />
          {hasPhoto ? 'Replace photo' : 'Upload photo'}
        </Button>
        {hasPhoto ? (
          <Button variant="outline" onClick={() => void handleUseDefault()} className="rounded-xl">
            Use default avatar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
