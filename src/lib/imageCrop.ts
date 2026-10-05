/**
 * Image Cropping & Ratio Utility
 * Ultra-high fidelity cropper for design portfolios.
 * Supports camera standard aspect ratios, original, freeform crop,
 * rotation, flip, and high-fidelity downscaling with canvas optimization.
 */

export type AspectRatioMode =
  | 'original'
  | 'free'
  | '1:1'
  | '4:3'
  | '3:4'
  | '3:2'
  | '2:3'
  | '16:9'
  | '9:16';

export interface AspectRatioOption {
  id: AspectRatioMode;
  label: string;
  badge: string;
  description: string;
  ratio: number | null; // width / height, null for free
}

export const ASPECT_RATIO_PRESETS: AspectRatioOption[] = [
  {
    id: 'original',
    label: '원본 비율',
    badge: 'Original',
    description: '사진 본래의 가로세로 비율 유지',
    ratio: -1, // dynamic
  },
  {
    id: 'free',
    label: '자율 모드',
    badge: 'Free',
    description: '가로·세로 크기를 원하는 대로 자유롭게 조정',
    ratio: null,
  },
  {
    id: '1:1',
    label: '1:1 정방형',
    badge: '1:1',
    description: '정사각형 구도 (SNS/스퀘어)',
    ratio: 1,
  },
  {
    id: '4:3',
    label: '4:3 가로',
    badge: '4:3',
    description: '디지털 카메라 표준 가로',
    ratio: 4 / 3,
  },
  {
    id: '3:4',
    label: '3:4 세로',
    badge: '3:4',
    description: '디지털 카메라 표준 세로',
    ratio: 3 / 4,
  },
  {
    id: '3:2',
    label: '3:2 DSLR',
    badge: '3:2',
    description: 'DSLR / 35mm 필름 카메라 가로',
    ratio: 3 / 2,
  },
  {
    id: '2:3',
    label: '2:3 세로',
    badge: '2:3',
    description: 'DSLR / 35mm 필름 카메라 세로',
    ratio: 2 / 3,
  },
  {
    id: '16:9',
    label: '16:9 와이드',
    badge: '16:9',
    description: '파노라마 / 와이드스크린',
    ratio: 16 / 9,
  },
  {
    id: '9:16',
    label: '9:16 세로',
    badge: '9:16',
    description: '스마트폰 풀스크린 / 릴스 세로',
    ratio: 9 / 16,
  },
];

export interface NormalizedCrop {
  x: number; // 0.0 to 1.0 (relative to display/source width)
  y: number; // 0.0 to 1.0 (relative to display/source height)
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export function calculateInitialCrop(
  naturalWidth: number,
  naturalHeight: number,
  mode: AspectRatioMode
): NormalizedCrop {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  if (mode === 'free') {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let targetRatio: number;
  if (mode === 'original') {
    targetRatio = naturalWidth / naturalHeight;
  } else {
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === mode);
    if (!preset || preset.ratio === null || preset.ratio === -1) {
      targetRatio = naturalWidth / naturalHeight;
    } else {
      targetRatio = preset.ratio;
    }
  }

  const imageRatio = naturalWidth / naturalHeight;
  let targetPixelW: number;
  let targetPixelH: number;

  if (imageRatio > targetRatio) {
    targetPixelH = naturalHeight;
    targetPixelW = naturalHeight * targetRatio;
  } else {
    targetPixelW = naturalWidth;
    targetPixelH = naturalWidth / targetRatio;
  }

  const normW = Math.min(1, targetPixelW / naturalWidth);
  const normH = Math.min(1, targetPixelH / naturalHeight);
  const normX = Math.max(0, (1 - normW) / 2);
  const normY = Math.max(0, (1 - normH) / 2);

  return {
    x: normX,
    y: normY,
    width: normW,
    height: normH,
  };
}
