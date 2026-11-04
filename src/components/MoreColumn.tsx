import React, { useRef, useEffect, useState, useMemo } from 'react';
import { WorkProject, ProjectContribution, MoreProcessBlock } from '../lib/types';
import { VisualFrame } from './VisualFrame';
import { MdxContent } from './MdxContent';

interface MoreColumnProps {
  activeProject: WorkProject | null;
  onClearActiveProject: () => void;
  onEditProject?: (project: WorkProject) => void;
  onProjectUpdated?: (updatedProject: WorkProject) => void;
}

export function getDefaultContribution(project: WorkProject): Required<ProjectContribution> {
  if (project.contribution && Array.isArray(project.contribution.phases) && project.contribution.phases.length > 0) {
    return {
      totalPercent: project.contribution.totalPercent || '90%',
      role: project.contribution.role || '',
      phases: project.contribution.phases,
    };
  }

  const lowerTitle = (project.title || '').toLowerCase();
  const isShowroom = lowerTitle.includes('showroom') || lowerTitle.includes('layer');

  if (isShowroom) {
    return {
      totalPercent: '90%',
      role: '',
      phases: [
        { label: '공간 기획 / 조형 디자인', percent: 100 },
        { label: '2D CAD / 3D 설계', percent: 100 },
        { label: '현장 시공 / VMD 감리', percent: 80 },
      ],
    };
  }

  return {
    totalPercent: '90%',
    role: '',
    phases: [
      { label: '기획 / 조형 디자인', percent: 100 },
      { label: '2D CAD / 3D 설계', percent: 100 },
      { label: '샘플 / 양산 감리', percent: 80 },
    ],
  };
}

export function buildEditorialBlocks(project: WorkProject): MoreProcessBlock[] {
  if (Array.isArray(project.moreBlocks) && project.moreBlocks.length > 0) {
    return project.moreBlocks.filter(
      (b) => (Array.isArray(b.images) && b.images.length > 0) || Boolean(b.description?.trim())
    );
  }

  // Gather available images: prioritize processImages, then project images
  const processImgs = Array.isArray(project.processImages)
    ? project.processImages.filter(Boolean)
    : [];
  const mainImgs: string[] = [];
  if (project.thumbnail) mainImgs.push(project.thumbnail);
  if (Array.isArray(project.images)) {
    for (const img of targetImages(project.images)) {
      if (img && !mainImgs.includes(img)) {
        mainImgs.push(img);
      }
    }
  }

  const pool = processImgs.length > 0 ? [...processImgs, ...mainImgs] : mainImgs;

  // Parse markdown sections (`### Title` or paragraphs) from project.content preserving **bold** and - list formatting
  const rawContent = (project.content || '').trim();
  const rawSections = rawContent
    ? rawContent
        .split(/\n(?=###\s|\n###\s)/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const parsedSections: { title: string; body: string }[] = [];
  if (rawSections.length > 1) {
    for (const sec of rawSections) {
      const lines = sec.split('\n');
      const firstLine = lines[0].replace(/^#+\s*/, '').trim();
      const rest = lines.slice(1).join('\n').trim();
      if (rest) {
        parsedSections.push({ title: firstLine, body: rest });
      }
    }
  }

  if (parsedSections.length === 0) {
    const paragraphs = rawContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const defaultTitles = [
      '기획 배경 및 조형 콘셉트',
      '구조 설계 및 디테일 엔지니어링',
      '1:1 프로토타입 및 양산화 감리',
    ];

    if (paragraphs.length > 0) {
      paragraphs.forEach((p, idx) => {
        const lines = p.split('\n');
        const hasHeading = lines[0].startsWith('#');
        const sectionTitle = hasHeading
          ? lines[0].replace(/^#+\s*/, '').trim()
          : defaultTitles[idx] || `디벨롭 프로세스 0${idx + 1}`;
        const sectionBody = hasHeading ? lines.slice(1).join('\n').trim() : p;
        parsedSections.push({
          title: sectionTitle,
          body: sectionBody,
        });
      });
    } else {
      parsedSections.push(
        {
          title: '기획 배경 및 조형 콘셉트',
          body: '- **비례감과 조형 연구**: 사용자의 일상 공간에 자연스럽게 스며드는 비례감과 조형적 균형을 도출하기 위해 초기 스케치와 스케일 스터디를 진행했습니다.',
        },
        {
          title: '2D CAD 도면 설계 및 양산 구조 디벨롭',
          body: '- **정밀 결구 및 양산 설계**: 원목의 수축·팽창과 하중 분산을 고려한 정밀 결구 구조를 2D/3D CAD 도면으로 설계하고, 협력 공장 샘플실과의 1:1 가봉 검수를 거쳐 최종 양산 스펙을 완성했습니다.',
        }
      );
    }
  }

  // Group images into chunks of 3 for each Cargo-style block
  const numBlocks = Math.min(
    Math.max(parsedSections.length, 1),
    Math.max(1, Math.ceil(pool.length / 3))
  );
  const blocks: MoreProcessBlock[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const startIdx = i * 3;
    let slice = pool.slice(startIdx, startIdx + 3);
    if (slice.length === 0 && pool.length > 0) {
      slice = pool.slice(0, Math.min(3, pool.length));
    }

    const sectionTitle = parsedSections[i]?.title || `Process 0${i + 1}`;
    let sectionBody = parsedSections[i]?.body || '';
    if (i === numBlocks - 1 && parsedSections.length > numBlocks) {
      const extra = parsedSections
        .slice(i + 1)
        .map((s) => `### ${s.title}\n${s.body}`)
        .join('\n\n');
      sectionBody = [sectionBody, extra].filter(Boolean).join('\n\n');
    }

    blocks.push({
      id: `block-${i + 1}`,
      title: sectionTitle,
      images: slice,
      description: sectionBody,
    });
  }

  return blocks;
}

function targetImages(imgs: string[]): string[] {
  return imgs.filter(
    (img) => img && !img.includes('display-system-1.jpg') && !img.includes('display-system-2.jpg')
  );
}

/**
 * 첫 번째 참고 이미지 스타일의 기여도 바 (블랙 라인 트랙 + 끝부분 원형 도트 포인트)
 */
export const ContributionLineGauge: React.FC<{ percent: number }> = ({ percent }) => {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div className="flex items-center gap-3">
      {/* 트랙 + 블랙 바 + 끝단 원형 노드 */}
      <div
        className="relative w-24 sm:w-40 h-[4px] rounded-full bg-[#ECECEC] border border-[rgba(0,0,0,0.12)] flex items-center shrink-0"
        aria-label={`기여도 ${clamped}%`}
      >
        <div
          className="h-full bg-black rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[9px] h-[9px] rounded-full bg-black transition-all duration-300"
          style={{ left: `${clamped}%` }}
        />
      </div>

      {/* 우측 퍼센트 수치 */}
      <span className="text-[13px] font-medium font-mono tabular-nums text-black w-10 text-right shrink-0">
        {clamped}%
      </span>
    </div>
  );
};

export const MoreColumn: React.FC<MoreColumnProps> = ({
  activeProject,
  onClearActiveProject,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedThumbMap, setSelectedThumbMap] = useState<Record<number, number>>({});

  useEffect(() => {
    setSelectedThumbMap({});
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeProject?.slug]);

  const project = activeProject;

  const editorialBlocks = useMemo(
    () => (project ? buildEditorialBlocks(project) : []),
    [project]
  );

  if (!project) {
    return (
      <div className="w-full flex flex-col bg-white">
        <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
          <span className="text-[13px] text-[rgba(0,0,0,0.4)] font-normal">More</span>
        </div>
        <div className="p-6 text-[13px] text-[rgba(0,0,0,0.4)] font-normal leading-relaxed">
          좌측 Work 목록 또는 Resume의 경험 항목을 선택하면 해당 제품의 디벨롭 과정과 상세 스펙이 이 공간에 표시됩니다.
        </div>
      </div>
    );
  }

  const isExperience =
    (project.order && project.order >= 100) ||
    project.slug.includes('poing') ||
    project.slug.includes('como') ||
    project.slug.includes('librat') ||
    project.slug.includes('convenset');

  const formattedOrder =
    !isExperience && project.order ? String(project.order).padStart(2, '0') : null;

  const contribution = getDefaultContribution(project);

  return (
    <div ref={scrollContainerRef} className="w-full flex flex-col bg-white select-text">
      {/* Column Header: More */}
      <div className="h-9 px-4 sm:px-6 flex items-center justify-between border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
        <span className="text-[13px] text-black font-normal">More</span>
        <button
          onClick={onClearActiveProject}
          className="text-[12px] text-[rgba(0,0,0,0.45)] hover:text-black font-normal cursor-pointer transition-colors whitespace-nowrap"
          title="Close details"
        >
          [Close]
        </button>
      </div>

      {/* Main Content Body */}
      <div className="px-4 sm:px-6 pb-10">
        {/* 1. PROJECT TITLE ROW — 상하 여백 균등(세로 중앙 정렬) */}
        <div className="py-4 border-b border-black flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium text-black tracking-tight leading-none">
            {formattedOrder ? `${formattedOrder}. ` : ''}
            {project.title}
          </h2>
          <span className="text-[12px] font-mono tabular-nums text-[rgba(0,0,0,0.5)] shrink-0 leading-none">
            {project.date}
          </span>
        </div>

        {/* 2. SPECIFICATION & CONTRIBUTION TABLE */}
        <section className="divide-y divide-[rgba(0,0,0,0.1)] border-b border-[rgba(0,0,0,0.15)] text-[13px]">
          {/* Brand (브랜드 기재란 — Materials 상단 배치) */}
          <div className="py-3 grid grid-cols-12 gap-3 items-baseline">
            <span className="col-span-4 sm:col-span-3 text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
              Brand
            </span>
            <span className="col-span-8 sm:col-span-9 text-[13px] text-black font-normal leading-relaxed">
              {project.brand ||
                (isExperience ? 'Exhibition / Independent Project' : 'CHALS FURNITURE (찰스퍼니처)')}
            </span>
          </div>

          {/* Materials */}
          <div className="py-3 grid grid-cols-12 gap-3 items-baseline">
            <span className="col-span-4 sm:col-span-3 text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
              Materials
            </span>
            <span className="col-span-8 sm:col-span-9 text-[13px] text-black font-normal leading-relaxed">
              {project.materials || 'Solid Wood, Engineered Hardware'}
            </span>
          </div>

          {/* Dimensions */}
          <div className="py-3 grid grid-cols-12 gap-3 items-baseline">
            <span className="col-span-4 sm:col-span-3 text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
              Dimensions
            </span>
            <span className="col-span-8 sm:col-span-9 text-[13px] text-black font-normal leading-relaxed">
              {project.dimensions || 'Standard Production Spec'}
            </span>
          </div>

          {/* Process Scope */}
          <div className="py-3 grid grid-cols-12 gap-3 items-baseline">
            <span className="col-span-4 sm:col-span-3 text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
              Process Scope
            </span>
            <span className="col-span-8 sm:col-span-9 text-[13px] text-black font-normal leading-relaxed">
              {isExperience
                ? 'Concept Ideation · 3D CAD Modeling · Prototype Fabrication'
                : 'Product Planning · 3D/CAD Drawing · 1:1 Prototyping · Mass-Production QC'}
            </span>
          </div>

          {/* Contribution (기여도) */}
          {!isExperience && contribution.phases.length > 0 && (
            <div className="py-3.5 grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-3 pt-0.5">
                <span className="text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
                  Contribution
                </span>
              </div>

              <div className="col-span-12 sm:col-span-9 space-y-2.5">
                {contribution.phases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
                      <span className="text-black font-normal truncate">{phase.label}</span>
                    </div>

                    <ContributionLineGauge percent={phase.percent} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.externalUrl && (
            <div className="py-3 grid grid-cols-12 gap-3 items-baseline">
              <span className="col-span-4 sm:col-span-3 text-[11px] font-mono text-[rgba(0,0,0,0.45)] uppercase tracking-wider">
                Reference
              </span>
              <div className="col-span-8 sm:col-span-9">
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-black underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  <span>Official Exhibition / Reference Link ↗</span>
                </a>
              </div>
            </div>
          )}
        </section>

        {/* 3. CARGO-STYLE EDITORIAL LAYOUT (이전 버전의 정돈된 타이포그래피 & 볼드/불릿 계층 적용) */}
        <section className="pt-6 space-y-12">
          {editorialBlocks.map((block, blockIdx) => {
            const images = block.images || [];
            const activeImgIdx = selectedThumbMap[blockIdx] ?? 0;
            const currentMainImage = images[activeImgIdx] || images[0] || project.thumbnail;

            return (
              <article key={block.id || blockIdx} className="space-y-4">
                {/* 상단: 대표이미지 (기본 프레임) */}
                {currentMainImage && (
                  <div className="w-full overflow-hidden bg-[#FAF9F6]">
                    <VisualFrame
                      src={currentMainImage}
                      alt={`${project.title} ${block.title || ''}`}
                      aspectRatio="auto"
                    />
                  </div>
                )}

                {/* 하단 2단 분할: 좌측 서브 썸네일 리스트 + 우측 정돈된 설명란 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-1 items-start">
                  {/* 좌측: 대표/서브이미지 썸네일 스위처 */}
                  <div className="sm:col-span-5 flex flex-wrap gap-2.5">
                    {images.map((thumbSrc, thumbIdx) => {
                      const isSelected = activeImgIdx === thumbIdx;

                      return (
                        <button
                          key={thumbIdx}
                          type="button"
                          onClick={() =>
                            setSelectedThumbMap((prev) => ({
                              ...prev,
                              [blockIdx]: thumbIdx,
                            }))
                          }
                          className="group flex flex-col items-start text-left cursor-pointer focus:outline-none"
                          title="이미지 크게 보기"
                        >
                          <div
                            className={`w-16 h-20 sm:w-[68px] sm:h-[84px] overflow-hidden bg-[#FAF9F6] transition-all ${
                              isSelected
                                ? 'ring-1 ring-black opacity-100'
                                : 'opacity-65 group-hover:opacity-100'
                            }`}
                          >
                            <img
                              src={thumbSrc}
                              alt={`${project.title} thumbnail ${thumbIdx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 우측: 설명내용 (선명한 소제목 + 볼드 키워드 + 불릿 내어쓰기가 적용된 MdxContent) */}
                  <div className="sm:col-span-7 text-[13px] leading-[1.7] text-black">
                    {block.title && (
                      <h3 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-black mb-2.5 leading-snug">
                        {block.title}
                      </h3>
                    )}
                    <MdxContent content={block.description || ''} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};
