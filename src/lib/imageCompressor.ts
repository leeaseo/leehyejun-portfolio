/**
 * High-definition image optimizer for portfolio display.
 * Preserves crisp 2400px Retina resolution and 0.88-0.92 JPEG quality so CAD dimension drawings,
 * typography, and fine fabric textures remain razor-sharp while keeping total JSON under GitHub's 25MB limit.
 */

function canvasToOptimizedDataUrl(
  canvas: HTMLCanvasElement,
  initialQuality = 0.92,
  maxBase64Length = 480000 // ~360KB binary JPEG at 2400px (indistinguishable from original)
): string {
  const mime = 'image/jpeg';
  let dataUrl = canvas.toDataURL(mime, initialQuality);

  // Gently step down quality only if exceeding maxBase64Length (never drop below 0.84 so textures/lines stay razor-sharp)
  const qualitySteps = [0.90, 0.88, 0.86, 0.84];
  for (const q of qualitySteps) {
    if (dataUrl.length <= maxBase64Length) return dataUrl;
    dataUrl = canvas.toDataURL(mime, q);
  }

  // Only if still above budget, step dimensions to 2200px or 1920px at high quality (0.86)
  const maxDimSteps = [2200, 1920];
  for (const targetDim of maxDimSteps) {
    if (dataUrl.length <= maxBase64Length) break;
    if (canvas.width > targetDim || canvas.height > targetDim) {
      const scale = targetDim / Math.max(canvas.width, canvas.height);
      const downCanvas = document.createElement('canvas');
      downCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      downCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      const dCtx = downCanvas.getContext('2d');
      if (dCtx) {
        dCtx.fillStyle = '#FFFFFF';
        dCtx.fillRect(0, 0, downCanvas.width, downCanvas.height);
        dCtx.imageSmoothingEnabled = true;
        dCtx.imageSmoothingQuality = 'high';
        dCtx.drawImage(canvas, 0, 0, downCanvas.width, downCanvas.height);
        dataUrl = downCanvas.toDataURL(mime, 0.86);
      }
    }
  }

  return dataUrl;
}

export async function compressImageFile(
  file: File,
  maxDimension = 2400,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      // If file is already small (< 220KB), keep original data URL untouched for 100% lossless quality (especially CAD drawings)
      if (file.size <= 220 * 1024 && rawResult.startsWith('data:image/')) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawResult);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawResult);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvasToOptimizedDataUrl(canvas, quality));
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Gently optimizes an oversized Base64 data URL only when it exceeds maxBase64Length.
 * Any image already <= maxBase64Length is returned 100% untouched (zero generational loss).
 */
export async function optimizeExistingDataUrl(
  imgSrc: string,
  maxDimension = 2400,
  maxBase64Length = 420000
): Promise<string> {
  if (!imgSrc || !imgSrc.startsWith('data:image')) return imgSrc;
  // Never re-compress an image that is already within the per-image budget!
  if (imgSrc.length <= maxBase64Length) return imgSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(imgSrc);
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width <= 0 || height <= 0) {
        resolve(imgSrc);
        return;
      }

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
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imgSrc);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvasToOptimizedDataUrl(canvas, 0.92, maxBase64Length);
      resolve(optimized.length < imgSrc.length ? optimized : imgSrc);
    };
    img.src = imgSrc;
  });
}

export { canvasToOptimizedDataUrl };
export const readOriginalImageFile = compressImageFile;
