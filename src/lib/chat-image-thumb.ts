/** Max edge length for chat album / bubble thumbnails. */
const THUMB_MAX_EDGE = 480;
const THUMB_JPEG_QUALITY = 0.72;

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

/**
 * Create a small JPEG thumbnail for album grids and chat bubbles.
 * Returns null on failure so callers can still upload the original.
 */
export async function createChatImageThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return null;
  }

  try {
    const img = await loadImageElement(file);
    const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', THUMB_JPEG_QUALITY);
    });
    return blob;
  } catch {
    return null;
  }
}
