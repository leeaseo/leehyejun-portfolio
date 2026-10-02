/**
 * Full-fidelity image loader and processor
 * Preserves 100% original camera resolution and visual sharpness
 */

export async function readOriginalImageFile(
  file: File,
  _maxWidth?: number,
  _maxHeight?: number,
  _quality?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If file is within reasonable web upload size (< 20MB), read 100% original bytes
    if (file.size <= 20 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // Only if file is excessively large (> 20MB raw file), downscale gracefully to 4K ultra-sharp resolution
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 3840; // 4K Ultra HD
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Keep 98% quality for pristine detail
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.98));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Backward-compatible alias for existing imports
export const compressImageFile = readOriginalImageFile;
