import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  FlipHorizontal,
  RefreshCw,
  Crop as CropIcon,
  Camera,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { AspectRatioMode, ASPECT_RATIO_PRESETS, AspectRatioOption } from '../lib/imageCrop';

export type AspectRatioType = AspectRatioMode;

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  subtitle?: string;
  currentIndex?: number;
  totalCount?: number;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  onSkip?: () => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle =
  | 'move'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | null;

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  title = '이미지 자르기 & 비율 조절',
  subtitle,
  currentIndex,
  totalCount,
  onClose,
  onCropComplete,
  onSkip,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original');
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Loaded image natural dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Display dimensions of image inside preview container
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Crop rectangle in display pixels relative to the displayed image
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Dragging state
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  const isSideways = rotation === 90 || rotation === 270;
  const effectiveNatW = isSideways ? naturalSize.height : naturalSize.width;
  const effectiveNatH = isSideways ? naturalSize.width : naturalSize.height;

  // Initialize crop rectangle based on ratio
  const initCrop = useCallback(
    (
      dispW: number,
      dispH: number,
      natW: number,
      natH: number,
      ratioType: AspectRatioType
    ) => {
      if (dispW <= 0 || dispH <= 0 || natW <= 0 || natH <= 0) return;

      let targetRatio: number | null = null;
      if (ratioType === 'original') {
        targetRatio = natW / natH;
      } else if (ratioType === '1:1') {
        targetRatio = 1;
      } else if (ratioType === '4:3') {
        targetRatio = 4 / 3;
      } else if (ratioType === '3:4') {
        targetRatio = 3 / 4;
      } else if (ratioType === '3:2') {
        targetRatio = 3 / 2;
      } else if (ratioType === '2:3') {
        targetRatio = 2 / 3;
      } else if (ratioType === '16:9') {
        targetRatio = 16 / 9;
      } else if (ratioType === '9:16') {
        targetRatio = 9 / 16;
      }

      if (targetRatio === null) {
        // Free ratio: default to 95% centered
        const padW = dispW * 0.025;
        const padH = dispH * 0.025;
        setCrop({
          x: padW,
          y: padH,
          width: dispW - padW * 2,
          height: dispH - padH * 2,
        });
      } else {
        // Constrained ratio: fit largest rectangle with targetRatio inside display
        let w = dispW * 0.95;
        let h = w / targetRatio;
        if (h > dispH * 0.95) {
          h = dispH * 0.95;
          w = h * targetRatio;
        }
        setCrop({
          x: (dispW - w) / 2,
          y: (dispH - h) / 2,
          width: w,
          height: h,
        });
      }
    },
    []
  );

  // Handle image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setNaturalSize({ width: natW, height: natH });

    updateDisplayLayout(natW, natH, rotation);
  };

  const updateDisplayLayout = (
    natW: number,
    natH: number,
    currentRotation: number
  ) => {
    const container = containerRef.current;
    if (!container || natW <= 0 || natH <= 0) return;

    const sideways = currentRotation === 90 || currentRotation === 270;
    const effW = sideways ? natH : natW;
    const effH = sideways ? natW : natH;

    const maxW = container.clientWidth - 48;
    const maxH = container.clientHeight - 48;

    const scale = Math.min(maxW / effW, maxH / effH, 1);
    const dispW = Math.round(effW * scale);
    const dispH = Math.round(effH * scale);

    setDisplaySize({ width: dispW, height: dispH });
    initCrop(dispW, dispH, effW, effH, aspectRatio);
  };

  // Switch aspect ratio
  const handleSelectRatio = (type: AspectRatioType) => {
    setAspectRatio(type);
    initCrop(displaySize.width, displaySize.height, effectiveNatW, effectiveNatH, type);
  };

  // Reset controls
  const handleReset = () => {
    setRotation(0);
    setIsFlippedH(false);
    setAspectRatio('original');
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      updateDisplayLayout(naturalSize.width, naturalSize.height, 0);
    }
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      updateDisplayLayout(naturalSize.width, naturalSize.height, nextRot);
    }
  };

  // Flip horizontal
  const handleFlip = () => {
    setIsFlippedH((prev) => !prev);
  };

  // Drag interaction handlers
  const handleMouseDown = (e: React.MouseEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const handleTouchStart = (e: React.TouchEvent, handle: DragHandle) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    dragRef.current = {
      handle,
      startX: touch.clientX,
      startY: touch.clientY,
      startCrop: { ...crop },
    };
  };

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      const { handle, startX, startY, startCrop } = dragRef.current;
      const dx = clientX - startX;
      const dy = clientY - startY;

      const dispW = displaySize.width;
      const dispH = displaySize.height;
      if (dispW <= 0 || dispH <= 0) return;

      const minSize = 25;

      let targetRatio: number | null = null;
      if (aspectRatio === 'original' && effectiveNatW > 0 && effectiveNatH > 0) {
        targetRatio = effectiveNatW / effectiveNatH;
      } else if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '3:4') targetRatio = 3 / 4;
      else if (aspectRatio === '3:2') targetRatio = 3 / 2;
      else if (aspectRatio === '2:3') targetRatio = 2 / 3;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;
      else if (aspectRatio === '9:16') targetRatio = 9 / 16;

      if (handle === 'move') {
        const newX = Math.max(0, Math.min(dispW - startCrop.width, startCrop.x + dx));
        const newY = Math.max(0, Math.min(dispH - startCrop.height, startCrop.y + dy));
        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
        return;
      }

      let newX = startCrop.x;
      let newY = startCrop.y;
      let newW = startCrop.width;
      let newH = startCrop.height;

      if (targetRatio === null) {
        // Freeform resize
        if (handle === 'se') {
          newW = Math.max(minSize, Math.min(dispW - startCrop.x, startCrop.width + dx));
          newH = Math.max(minSize, Math.min(dispH - startCrop.y, startCrop.height + dy));
        } else if (handle === 'sw') {
          const maxLeftShift = startCrop.width - minSize;
          const shift = Math.max(-startCrop.x, Math.min(maxLeftShift, dx));
          newX = startCrop.x + shift;
          newW = startCrop.width - shift;
          newH = Math.max(minSize, Math.min(dispH - startCrop.y, startCrop.height + dy));
        } else if (handle === 'ne') {
          newW = Math.max(minSize, Math.min(dispW - startCrop.x, startCrop.width + dx));
          const maxUpShift = startCrop.height - minSize;
          const shift = Math.max(-startCrop.y, Math.min(maxUpShift, dy));
          newY = startCrop.y + shift;
          newH = startCrop.height - shift;
        } else if (handle === 'nw') {
          const maxLeftShift = startCrop.width - minSize;
          const shiftX = Math.max(-startCrop.x, Math.min(maxLeftShift, dx));
          newX = startCrop.x + shiftX;
          newW = startCrop.width - shiftX;

          const maxUpShift = startCrop.height - minSize;
          const shiftY = Math.max(-startCrop.y, Math.min(maxUpShift, dy));
          newY = startCrop.y + shiftY;
          newH = startCrop.height - shiftY;
        } else if (handle === 'e') {
          newW = Math.max(minSize, Math.min(dispW - startCrop.x, startCrop.width + dx));
        } else if (handle === 'w') {
          const maxLeftShift = startCrop.width - minSize;
          const shift = Math.max(-startCrop.x, Math.min(maxLeftShift, dx));
          newX = startCrop.x + shift;
          newW = startCrop.width - shift;
        } else if (handle === 's') {
          newH = Math.max(minSize, Math.min(dispH - startCrop.y, startCrop.height + dy));
        } else if (handle === 'n') {
          const maxUpShift = startCrop.height - minSize;
          const shift = Math.max(-startCrop.y, Math.min(maxUpShift, dy));
          newY = startCrop.y + shift;
          newH = startCrop.height - shift;
        }
      } else {
        // Locked aspect ratio resize
        if (handle === 'se') {
          let w = startCrop.width + dx;
          let h = w / targetRatio;
          if (startCrop.x + w > dispW) {
            w = dispW - startCrop.x;
            h = w / targetRatio;
          }
          if (startCrop.y + h > dispH) {
            h = dispH - startCrop.y;
            w = h * targetRatio;
          }
          if (w >= minSize && h >= minSize) {
            newW = w;
            newH = h;
          }
        } else if (handle === 'nw') {
          let w = startCrop.width - dx;
          let h = w / targetRatio;
          const maxShiftX = startCrop.x + startCrop.width - minSize;
          const maxShiftY = startCrop.y + startCrop.height - minSize;

          let shiftX = startCrop.width - w;
          let shiftY = startCrop.height - h;

          if (startCrop.x - shiftX < 0) {
            w = startCrop.x + startCrop.width;
            h = w / targetRatio;
            shiftX = startCrop.x;
            shiftY = startCrop.height - h;
          }
          if (startCrop.y - shiftY < 0) {
            h = startCrop.y + startCrop.height;
            w = h * targetRatio;
            shiftY = startCrop.y;
            shiftX = startCrop.width - w;
          }

          if (w >= minSize && h >= minSize && shiftX <= maxShiftX && shiftY <= maxShiftY) {
            newX = startCrop.x - shiftX;
            newY = startCrop.y - shiftY;
            newW = w;
            newH = h;
          }
        } else if (handle === 'ne') {
          let w = startCrop.width + dx;
          let h = w / targetRatio;
          if (startCrop.x + w > dispW) {
            w = dispW - startCrop.x;
            h = w / targetRatio;
          }
          const shiftY = startCrop.height - h;
          if (startCrop.y - shiftY < 0) {
            h = startCrop.y + startCrop.height;
            w = h * targetRatio;
          }
          if (w >= minSize && h >= minSize) {
            newY = startCrop.y - (startCrop.height - h);
            newW = w;
            newH = h;
          }
        } else if (handle === 'sw') {
          let w = startCrop.width - dx;
          let h = w / targetRatio;
          if (startCrop.y + h > dispH) {
            h = dispH - startCrop.y;
            w = h * targetRatio;
          }
          const shiftX = startCrop.width - w;
          if (startCrop.x - shiftX < 0) {
            w = startCrop.x + startCrop.width;
            h = w / targetRatio;
          }
          if (w >= minSize && h >= minSize) {
            newX = startCrop.x - (startCrop.width - w);
            newW = w;
            newH = h;
          }
        } else {
          // Edges in locked ratio mode
          if (handle === 'e' || handle === 'w') {
            const deltaW = handle === 'e' ? dx : -dx;
            let w = startCrop.width + deltaW;
            let h = w / targetRatio;
            if (w >= minSize && h >= minSize && startCrop.x + w <= dispW && startCrop.y + h <= dispH) {
              newW = w;
              newH = h;
              if (handle === 'w') newX = startCrop.x - deltaW;
            }
          } else {
            const deltaH = handle === 's' ? dy : -dy;
            let h = startCrop.height + deltaH;
            let w = h * targetRatio;
            if (w >= minSize && h >= minSize && startCrop.x + w <= dispW && startCrop.y + h <= dispH) {
              newW = w;
              newH = h;
              if (handle === 'n') newY = startCrop.y - deltaH;
            }
          }
        }
      }

      setCrop({
        x: Math.max(0, Math.min(dispW - minSize, newX)),
        y: Math.max(0, Math.min(dispH - minSize, newY)),
        width: Math.max(minSize, Math.min(dispW - newX, newW)),
        height: Math.max(minSize, Math.min(dispH - newY, newH)),
      });
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [displaySize, aspectRatio, effectiveNatW, effectiveNatH]);

  // Ultra-high definition Canvas Cropping (up to 2560px, JPEG quality 0.92)
  const handleApplyCrop = async () => {
    if (!imageRef.current || displaySize.width <= 0 || displaySize.height <= 0) {
      onClose();
      return;
    }

    try {
      setIsProcessing(true);
      const img = imageRef.current;
      const rawNatW = img.naturalWidth || naturalSize.width;
      const rawNatH = img.naturalHeight || naturalSize.height;

      // 1. Create transformed full image canvas
      const sideways = rotation === 90 || rotation === 270;
      const transCanvas = document.createElement('canvas');
      transCanvas.width = sideways ? rawNatH : rawNatW;
      transCanvas.height = sideways ? rawNatW : rawNatH;

      const tCtx = transCanvas.getContext('2d');
      if (!tCtx) {
        onClose();
        return;
      }

      tCtx.save();
      tCtx.translate(transCanvas.width / 2, transCanvas.height / 2);
      if (rotation !== 0) {
        tCtx.rotate((rotation * Math.PI) / 180);
      }
      if (isFlippedH) {
        tCtx.scale(-1, 1);
      }
      tCtx.drawImage(img, -rawNatW / 2, -rawNatH / 2);
      tCtx.restore();

      // 2. Calculate crop coordinates on the transformed canvas
      const scaleX = transCanvas.width / displaySize.width;
      const scaleY = transCanvas.height / displaySize.height;

      const sx = Math.max(0, Math.round(crop.x * scaleX));
      const sy = Math.max(0, Math.round(crop.y * scaleY));
      const sw = Math.min(transCanvas.width - sx, Math.round(crop.width * scaleX));
      const sh = Math.min(transCanvas.height - sy, Math.round(crop.height * scaleY));

      // 3. Retina 2560px limit for razor-sharp product details
      const maxDim = 2560;
      let outW = sw;
      let outH = sh;

      if (outW > maxDim || outH > maxDim) {
        if (outW > outH) {
          outH = Math.round((outH * maxDim) / outW);
          outW = maxDim;
        } else {
          outW = Math.round((outW * maxDim) / outH);
          outH = maxDim;
        }
      }

      const outCanvas = document.createElement('canvas');
      outCanvas.width = Math.max(1, outW);
      outCanvas.height = Math.max(1, outH);

      const ctx = outCanvas.getContext('2d');
      if (!ctx) {
        onClose();
        return;
      }

      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, outW, outH);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(transCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

      // High-quality JPEG (0.92) for pristine gallery quality
      const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedDataUrl);
    } catch (err) {
      console.error('Failed to crop image:', err);
      alert('이미지 크롭 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  // Approximate output resolution badge
  const outputW = Math.round((crop.width / (displaySize.width || 1)) * effectiveNatW);
  const outputH = Math.round((crop.height / (displaySize.height || 1)) * effectiveNatH);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-white w-full max-w-4xl max-h-[96vh] flex flex-col border border-black shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="h-11 px-4 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-black">
            <CropIcon size={15} />
            <span>{title}</span>
            {totalCount && totalCount > 1 && currentIndex !== undefined && (
              <span className="text-[11px] font-mono px-2 py-0.5 bg-black text-white">
                {currentIndex + 1} / {totalCount}
              </span>
            )}
            {effectiveNatW > 0 && (
              <span className="text-[11px] text-[rgba(0,0,0,0.4)] font-mono hidden sm:inline">
                (원본: {effectiveNatW} × {effectiveNatH}px)
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-[rgba(0,0,0,0.45)] hidden md:inline">
                · {subtitle}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(0,0,0,0.5)] hover:text-black p-1 cursor-pointer"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.1)] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto text-[11.5px] max-w-full scrollbar-none py-0.5">
            <span className="text-[rgba(0,0,0,0.45)] mr-1 font-mono text-[10.5px] flex items-center gap-1 shrink-0">
              <Camera size={12} />
              <span>비율:</span>
            </span>
            {ASPECT_RATIO_PRESETS.map((preset) => {
              const active = aspectRatio === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectRatio(preset.id)}
                  title={`${preset.label} - ${preset.description}`}
                  className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer shrink-0 ${
                    active
                      ? 'bg-black text-white border-black font-medium'
                      : 'bg-white text-black border-[rgba(0,0,0,0.2)] hover:border-black'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Quick Transform Tools */}
          <div className="flex items-center gap-1.5 text-[11px] shrink-0">
            <button
              type="button"
              onClick={handleRotate}
              className="px-2 py-1 border border-[rgba(0,0,0,0.2)] bg-white hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
              title="오른쪽으로 90도 회전"
            >
              <RotateCw size={12} />
              <span>90° 회전</span>
            </button>
            <button
              type="button"
              onClick={handleFlip}
              className={`px-2 py-1 border flex items-center gap-1 cursor-pointer transition-colors ${
                isFlippedH
                  ? 'bg-black text-white border-black font-medium'
                  : 'border-[rgba(0,0,0,0.2)] bg-white hover:bg-neutral-100'
              }`}
              title="좌우 반전"
            >
              <FlipHorizontal size={12} />
              <span>좌우반전</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 border border-[rgba(0,0,0,0.2)] bg-white hover:bg-neutral-100 text-neutral-600 flex items-center gap-1 cursor-pointer"
              title="초기화"
            >
              <RefreshCw size={11} />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* Cropping Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#1A1A1A] overflow-hidden flex items-center justify-center p-4 relative min-h-[350px] sm:min-h-[460px]"
        >
          {/* Displayed Image and Overlay Box */}
          <div
            className="relative select-none"
            style={{
              width: displaySize.width || 'auto',
              height: displaySize.height || 'auto',
            }}
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop Source"
              onLoad={handleImageLoad}
              style={{
                width: displaySize.width ? `${displaySize.width}px` : 'auto',
                height: displaySize.height ? `${displaySize.height}px` : 'auto',
                transform: `rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                transition: 'transform 0.12s ease-out',
                display: 'block',
              }}
              className="pointer-events-none"
            />

            {/* Dark Mask Surrounding Crop Box */}
            {displaySize.width > 0 && (
              <>
                {/* Top mask */}
                <div
                  className="absolute bg-black/65 pointer-events-none"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${crop.y}px`,
                  }}
                />
                {/* Bottom mask */}
                <div
                  className="absolute bg-black/65 pointer-events-none"
                  style={{
                    top: `${crop.y + crop.height}px`,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                {/* Left mask */}
                <div
                  className="absolute bg-black/65 pointer-events-none"
                  style={{
                    top: `${crop.y}px`,
                    left: 0,
                    width: `${crop.x}px`,
                    height: `${crop.height}px`,
                  }}
                />
                {/* Right mask */}
                <div
                  className="absolute bg-black/65 pointer-events-none"
                  style={{
                    top: `${crop.y}px`,
                    left: `${crop.x + crop.width}px`,
                    right: 0,
                    height: `${crop.height}px`,
                  }}
                />

                {/* Interactive Crop Box Window */}
                <div
                  className="absolute border border-white shadow-2xl cursor-move touch-none"
                  style={{
                    top: `${crop.y}px`,
                    left: `${crop.x}px`,
                    width: `${crop.width}px`,
                    height: `${crop.height}px`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                  onTouchStart={(e) => handleTouchStart(e, 'move')}
                >
                  {/* 3x3 Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div className="border-b border-white/35 border-dashed" />
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div className="border-b border-white/35 border-dashed" />
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div className="border-r border-b border-white/35 border-dashed" />
                    <div />
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleTouchStart(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-black cursor-nwse-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleTouchStart(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-black cursor-nesw-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleTouchStart(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-black cursor-nesw-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleTouchStart(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-black cursor-nwse-resize shadow-xs"
                  />

                  {/* Edge Resize Handles */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'n')}
                    onTouchStart={(e) => handleTouchStart(e, 'n')}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border border-black cursor-ns-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 's')}
                    onTouchStart={(e) => handleTouchStart(e, 's')}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border border-black cursor-ns-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'w')}
                    onTouchStart={(e) => handleTouchStart(e, 'w')}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-white border border-black cursor-ew-resize shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'e')}
                    onTouchStart={(e) => handleTouchStart(e, 'e')}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-white border border-black cursor-ew-resize shadow-xs"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="h-13 px-4 border-t border-[rgba(0,0,0,0.15)] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-[12px] text-[rgba(0,0,0,0.6)]">
            <span className="font-mono">
              크롭 영역: <strong>{outputW}</strong> × <strong>{outputH}</strong> px
            </span>
            <span className="text-[11px] text-[rgba(0,0,0,0.4)] hidden sm:inline">
              (박스를 마우스로 끌거나 모서리를 조절하세요)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12px] border border-[rgba(0,0,0,0.3)] bg-white hover:bg-neutral-100 cursor-pointer"
            >
              취소
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="px-3.5 py-1.5 text-[12px] border border-[rgba(0,0,0,0.3)] bg-neutral-50 hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
                title="크롭 없이 원본 그대로 등록"
              >
                <SkipForward size={12} />
                <span>원본 그대로 사용</span>
              </button>
            )}

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCrop}
              className="px-4 py-1.5 text-[12px] bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>처리 중...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>
                    {totalCount && totalCount > 1 && currentIndex !== undefined && currentIndex < totalCount - 1
                      ? '자르기 적용 후 다음 사진'
                      : '자르기 완료 (적용)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
