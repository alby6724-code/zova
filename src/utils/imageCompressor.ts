/**
 * Client-side WebP image compression utility
 * Resizes large photos to optimal dimensions (max 1600px) and converts to WebP with ~80% quality.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving resize
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback to raw data url if canvas context unavailable
          return resolve(reader.result as string);
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          if (webpDataUrl.startsWith('data:image/webp')) {
            return resolve(webpDataUrl);
          }
        } catch {
          // Ignore and fallback to jpeg
        }

        // Fallback to JPEG
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
