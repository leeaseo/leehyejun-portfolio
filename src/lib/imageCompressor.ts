/**
 * High-definition image optimizer for portfolio display.
 * Preserves crisp 2560px Retina resolution and 0.90-0.94 WebP quality (with JPEG fallback)
 * so CAD dimension drawings, typography, and fine fabric/wood textures remain razor-sharp
 * while keeping total JSON under GitHub's 25MB limit.
 */

let cachedWebpSupport: boolean | null = null;

function supportsWebpEncoding(): boolean {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  if (typeof document === 'undefined') {
    cachedWebpSupport = false;
    return false;
  }
  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 2;
    testCanvas.height = 2;
    cachedWebpSupport = testCanvas.toDataURL('image/webp', 0.92).startsWith('data:image/webp');
  } catch {
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

function encodeCanvas(canvas: HTMLCanvasElement, mime: string, quality: number): string {
  if (mime === 'image/jpeg') {
    // JPEG has no alpha channel; composite onto white so transparent PNGs never turn black
    const opaqueCanvas = document.createElement('canvas');
    opaqueCanvas.width = canvas.width;
    opaqueCanvas.height = canvas.height;
    const oCtx = opaqueCanvas.getContext('2d');
    if (oCtx) {
      oCtx.fillStyle = '#FFFFFF';
      oCtx.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
      oCtx.drawImage(canvas, 0, 0);
      return opaqueCanvas.toDataURL('image/jpeg', quality);
    }
  }
  return canvas.toDataURL(mime, quality);
}

function canvasToOptimizedDataUrl(
  canvas: HTMLCanvasElement,
  initialQuality = 0.94,
  maxBase64Length = 1500000 // ~1.1MB binary at 2560px (razor-sharp Retina fidelity)
): string {
  const mime = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg';
  let dataUrl = encodeCanvas(canvas, mime, initialQuality);

  // Gently step down quality only if exceeding maxBase64Length
  const qualitySteps = [0.92, 0.90, 0.88, 0.86, 0.84].filter((q) => q < initialQuality);
  for (const q of qualitySteps) {
    if (dataUrl.length <= maxBase64Length) return dataUrl;
    dataUrl = encodeCanvas(canvas, mime, q);
  }

  // Only if still above budget, step dimensions gently at high quality
  const maxDimSteps = [2200, 1920, 1680];
  for (const targetDim of maxDimSteps) {
    if (dataUrl.length <= maxBase64Length) break;
    if (canvas.width > targetDim || canvas.height > targetDim) {
      const scale = targetDim / Math.max(canvas.width, canvas.height);
      const downCanvas = document.createElement('canvas');
      downCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      downCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      const dCtx = downCanvas.getContext('2d');
      if (dCtx) {
        dCtx.imageSmoothingEnabled = true;
        dCtx.imageSmoothingQuality = 'high';
        dCtx.drawImage(canvas, 0, 0, downCanvas.width, downCanvas.height);
        dataUrl = encodeCanvas(downCanvas, mime, 0.88);
        if (dataUrl.length > maxBase64Length) {
          dataUrl = encodeCanvas(downCanvas, mime, 0.84);
        }
      }
    }
  }

  return dataUrl;
}

export async function compressImageFile(
  file: File,
  maxDimension = 2560,
  quality = 0.94
): Promise<string> {
  const maxUploadBase64 = 1500000; // ~1.1MB binary

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      // Fast passthrough for compact files (< 350KB) for 100% lossless quality (especially CAD drawings)
      if (file.size <= 350 * 1024 && rawResult.startsWith('data:image/')) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawResult);
      img.onload = () => {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;

        // If already within Retina dimensions and size budget, preserve original pixel-for-pixel
        if (
          natW <= maxDimension &&
          natH <= maxDimension &&
          rawResult.length <= maxUploadBase64 &&
          rawResult.startsWith('data:image/')
        ) {
          resolve(rawResult);
          return;
        }

        let width = natW;
        let height = natH;

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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Preserve lossless PNG for line-art / CAD drawings if reasonably sized after resize
        const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
        if (isPng) {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length <= 1200000) {
            resolve(pngUrl);
            return;
          }
        }

        const optimized = canvasToOptimizedDataUrl(canvas, quality, maxUploadBase64);
        // Never replace with a larger re-encoded string when dimensions were not reduced
        if (natW <= maxDimension && natH <= maxDimension && optimized.length >= rawResult.length) {
          resolve(rawResult);
          return;
        }
        resolve(optimized);
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
  maxDimension = 2560,
  maxBase64Length = 1500000
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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvasToOptimizedDataUrl(canvas, 0.94, maxBase64Length);
      resolve(optimized.length < imgSrc.length ? optimized : imgSrc);
    };
    img.src = imgSrc;
  });
}

export { canvasToOptimizedDataUrl };
export const readOriginalImageFile = compressImageFile;
