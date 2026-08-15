'use client';

import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RemoteImage } from '@/components/ui/remote-image';
import { downloadPhoto } from '@/lib/ndcpc/photo-cache';
import { useTranslation } from '@/context/LocaleProvider';

type CachedPhotoProps = {
  url: string;
  alt: string;
  filename: string;
  canDelete?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
};

/**
 * Gallery tile — render the remote URL with native lazy loading.
 * Do not blob every image on mount (that OOM-crashes Safari when the album is large).
 */
export function CachedPhoto({
  url,
  alt,
  filename,
  canDelete = false,
  onDelete,
  isDeleting = false,
}: CachedPhotoProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 [content-visibility:auto] [contain-intrinsic-size:280px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted/30">
        <RemoteImage
          src={url}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm">{alt}</p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadPhoto(url, filename)}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {t('photos.download')}
          </Button>
          {canDelete && onDelete ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={onDelete}
              aria-label={t('photos.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
