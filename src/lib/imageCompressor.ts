/**
 * Smart image compressor for high-resolution web portfolio display.
 * Generates ultra-crisp Retina-ready images (up to 2560px) with high fidelity (quality 0.92),
 * preserving razor-sharp product details, metal textures, and fine finishes.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 2560,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(e.target?.result as string);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally only if dimensions exceed maxDimension (2560px)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
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

        // Fill canvas with warm gallery background (#FAF9F6) so transparent PNGs
        // automatically blend with the site's background
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 0, width, height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality JPEG for crisp clarity
        const mimeType = file.type === 'image/png' && file.size < 1.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const readOriginalImageFile = compressImageFile;
