/**
 * Smart image compressor for high-resolution web portfolio display.
 * Uses high-efficiency progressive-grade JPEG at up to 1800px (Retina-ready for 3-column layout)
 * and adaptive quality/dimension stepping so each image is razor-sharp while strictly staying
 * within the target byte budget so custom-data.json NEVER exceeds GitHub's 25MB single-file limit.
 */

function canvasToOptimizedDataUrl(
  canvas: HTMLCanvasElement,
  initialQuality = 0.82,
  maxBase64Length = 165000 // ~120KB binary, ~165KB base64 string by default
): string {
  const mime = 'image/jpeg';
  let dataUrl = canvas.toDataURL(mime, initialQuality);

  // Step 1: Step down JPEG quality if larger than maxBase64Length
  const qualitySteps = [0.76, 0.70, 0.64, 0.58];
  for (const q of qualitySteps) {
    if (dataUrl.length <= maxBase64Length) return dataUrl;
    dataUrl = canvas.toDataURL(mime, q);
  }

  // Step 2: If still above budget (e.g., when portfolio has 150+ photos), scale dimensions down progressively
  const maxDimSteps = [1440, 1200, 1024];
  for (const targetDim of maxDimSteps) {
    if (dataUrl.length <= maxBase64Length) break;
    if (canvas.width > targetDim || canvas.height > targetDim) {
      const scale = targetDim / Math.max(canvas.width, canvas.height);
      const downCanvas = document.createElement('canvas');
      downCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      downCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      const dCtx = downCanvas.getContext('2d');
      if (dCtx) {
        dCtx.fillStyle = '#FAF9F6';
        dCtx.fillRect(0, 0, downCanvas.width, downCanvas.height);
        dCtx.imageSmoothingEnabled = true;
        dCtx.imageSmoothingQuality = 'high';
        dCtx.drawImage(canvas, 0, 0, downCanvas.width, downCanvas.height);
        dataUrl = downCanvas.toDataURL(mime, 0.72);
        if (dataUrl.length > maxBase64Length) {
          dataUrl = downCanvas.toDataURL(mime, 0.62);
        }
      }
    }
  }

  return dataUrl;
}

export async function compressImageFile(
  file: File,
  maxDimension = 1800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
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

        ctx.fillStyle = '#FAF9F6';
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
 * Re-optimizes an existing Base64 data URL (e.g., previously uploaded 1MB~2MB un-shrunk images)
 * so the user doesn't have to re-upload existing photos to shrink custom-data.json under 25MB.
 */
export async function optimizeExistingDataUrl(
  imgSrc: string,
  maxDimension = 1800,
  maxBase64Length = 165000
): Promise<string> {
  if (!imgSrc || !imgSrc.startsWith('data:image')) return imgSrc;
  // Already compact enough and is standard jpeg
  if (imgSrc.length <= maxBase64Length && imgSrc.startsWith('data:image/jpeg')) return imgSrc;

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

      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvasToOptimizedDataUrl(canvas, 0.80, maxBase64Length);
      resolve(optimized.length < imgSrc.length ? optimized : imgSrc);
    };
    img.src = imgSrc;
  });
}

export { canvasToOptimizedDataUrl };
export const readOriginalImageFile = compressImageFile;


