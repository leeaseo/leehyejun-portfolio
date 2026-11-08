import React, { useState, useEffect } from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';
import { isExperienceSlug } from '../lib/content';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkColumnProps {
  projects: WorkProject[];
  activeProject?: WorkProject | null;
  activeSlug: string | null;
  onSelectProject: (slug: string) => void;
  onOpenMoreTab?: () => void;
}

export const WorkColumn: React.FC<WorkColumnProps> = ({
  projects,
  activeProject,
  activeSlug,
  onSelectProject,
  onOpenMoreTab,
}) => {
  const [viewMode, setViewMode] = useState<'selected' | 'feed'>('selected');
  const [isQuickListOpen, setIsQuickListOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Strictly filter Work projects only (order < 100 and no experience projects)
  const workProjects = (projects || []).filter(
    (p) => Boolean(p && p.slug && !isExperienceSlug(p.slug) && (!p.order || p.order < 100))
  );

  // Switch back to selected project photo gallery whenever activeSlug changes to a real project
  useEffect(() => {
    if (activeSlug && activeSlug !== '__closed__') {
      setViewMode('selected');
      setLightboxIndex(null);
    }
  }, [activeSlug]);

  // Active project to show final product shoot images for
  const targetProject =
    activeProject ||
    workProjects.find((p) => p.slug === activeSlug) ||
    workProjects[0] ||
    null;

  // Assemble deduplicated final shoot images for the Photo column (never duplicating More block images or legacy furniture cutouts)
  const finalShootImages = React.useMemo(() => {
    if (!targetProject) return [];

    const moreImgSet = new Set<string>();
    if (Array.isArray(targetProject.moreBlocks)) {
      for (const b of targetProject.moreBlocks) {
        if (Array.isArray(b?.images)) {
          for (const mImg of b.images) {
            if (mImg) moreImgSet.add(mImg);
          }
        }
      }
    }

    const rawImages = Array.isArray(targetProject.images)
      ? targetProject.images.filter(Boolean)
      : [];
    const isShowroom = targetProject.slug === 'mobile-display-system';
    const list: string[] = [];

    // Only prepend thumbnail if this is the Yeonhui Showroom exterior shot or if rawImages is completely empty
    if (
      targetProject.thumbnail &&
      !moreImgSet.has(targetProject.thumbnail) &&
      (isShowroom || rawImages.length === 0)
    ) {
      list.push(targetProject.thumbnail);
    }

    for (const img of rawImages) {
      if (!img || list.includes(img)) continue;
      // Do not show an image in Photo if it is already placed in More editorial blocks (unless it's a numbered lifestyle shot)
      const isNumberedLifestyle = /-\d{2}(-[a-f0-9]+)?\.(jpg|jpeg|png|webp)$/i.test(img) && !img.includes('-block');
      if (moreImgSet.has(img) && !isNumberedLifestyle) continue;
      // For furniture projects (#2-#9), never show legacy -thumb white-background cutouts in Photo if lifestyle images exist
      if (!isShowroom && rawImages.length > 1 && /-thumb(-[a-f0-9]+)?(\.[a-z0-9]+)?$/i.test(img)) continue;
      list.push(img);
    }

    return list;
  }, [targetProject]);

  const currentWorkIdx = targetProject
    ? workProjects.findIndex((p) => p.slug === targetProject.slug)
    : -1;
  const formattedActiveOrder =
    targetProject && currentWorkIdx !== -1
      ? String(targetProject.order || currentWorkIdx + 1).padStart(2, '0')
      : targetProject?.order && targetProject.order < 100
      ? String(targetProject.order).padStart(2, '0')
      : null;

  const prevProject = currentWorkIdx > 0 ? workProjects[currentWorkIdx - 1] : null;
  const nextProject =
    currentWorkIdx !== -1 && currentWorkIdx < workProjects.length - 1
      ? workProjects[currentWorkIdx + 1]
      : null;

  return (
    <div className="w-full flex flex-col bg-white select-text">
      {/* Column Header: Photo — 깔끔하게 'Photo'만 표시 */}
      <div className="h-9 px-4 sm:px-6 flex items-center justify-between border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-20 shrink-0">
        <span className="text-[13px] text-black font-normal">Photo</span>
        {onOpenMoreTab && (
          <button
            type="button"
            onClick={onOpenMoreTab}
            className="lg:hidden text-[12px] text-black underline underline-offset-4 cursor-pointer whitespace-nowrap"
          >
            [More 보기]
          </button>
        )}
      </div>

      {/* Selected Project's Final Product Photography Stream (중복 제목 및 하단 캡션 제거) */}
      {targetProject ? (
        <div className="p-4 sm:p-6 space-y-6">
          {finalShootImages.length > 0 ? (
            <div className="space-y-6">
              {finalShootImages.map((imgSrc, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className="border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.25)] overflow-hidden bg-[#FAF9F6] cursor-zoom-in transition-colors"
                >
                  <VisualFrame
                    src={imgSrc}
                    alt={`${targetProject.title} Final Shoot ${idx + 1}`}
                    aspectRatio="auto"
                    subtitle={`PHOTO ${String(idx + 1).padStart(2, '0')}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-[rgba(0,0,0,0.15)] text-[13px] text-[rgba(0,0,0,0.45)]">
              등록된 제품 최종 촬영 이미지가 없습니다. 하단 Admin에서 Photo 이미지를 추가해 주세요.
            </div>
          )}

          {/* Bottom Prev / Next Project Navigation */}
          <div className="pt-6 border-t border-[rgba(0,0,0,0.15)] flex items-center justify-between gap-4 text-[13px]">
            <div>
              {prevProject ? (
                <button
                  type="button"
                  onClick={() => onSelectProject(prevProject.slug)}
                  className="text-left group cursor-pointer"
                >
                  <div className="text-[11px] text-[rgba(0,0,0,0.4)]">← Previous</div>
                  <div className="text-black group-hover:underline truncate max-w-[180px]">
                    {prevProject.title}
                  </div>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="text-right">
              {nextProject ? (
                <button
                  type="button"
                  onClick={() => onSelectProject(nextProject.slug)}
                  className="text-right group cursor-pointer"
                >
                  <div className="text-[11px] text-[rgba(0,0,0,0.4)]">Next →</div>
                  <div className="text-black group-hover:underline truncate max-w-[180px]">
                    {nextProject.title}
                  </div>
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: All Projects Photo Feed */
        <div className="divide-y divide-[rgba(0,0,0,0.15)]">
          {workProjects.map((project, index) => {
            const formattedIndex = String(project.order || index + 1).padStart(2, '0');
            const isActive = activeSlug === project.slug;
            const totalCuts = (project.images?.length || 0) + (project.thumbnail ? 1 : 0);

            return (
              <article
                key={project.slug}
                id={`project-${project.slug}`}
                className={`p-4 sm:p-6 transition-colors ${
                  isActive ? 'bg-[#FCFCFB]' : 'bg-white'
                }`}
              >
                <div
                  onClick={() => {
                    onSelectProject(project.slug);
                    setViewMode('selected');
                  }}
                  className="cursor-pointer mb-5 overflow-hidden flex items-center justify-center border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.2)] transition-colors bg-[#FAF9F6]"
                >
                  <div className="w-full">
                    <VisualFrame
                      src={project.images?.[0] || project.thumbnail || ''}
                      alt={project.title}
                      aspectRatio="auto"
                      subtitle={`${formattedIndex} / ${project.date}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] leading-relaxed mb-2 font-normal">
                  <div
                    onClick={() => {
                      onSelectProject(project.slug);
                      setViewMode('selected');
                    }}
                    className="font-normal text-black cursor-pointer hover:underline text-[15px] leading-snug"
                  >
                    {formattedIndex}. {project.title}
                  </div>

                  <div className="text-black text-left space-y-1 text-[13px] font-normal">
                    <div className="text-black font-normal text-left">{project.materials}</div>
                    <div className="text-black font-normal text-left">{project.dimensions}</div>
                    <div className="text-black font-normal text-left">{project.date}</div>

                    <div className="pt-2 flex items-center gap-3 text-left">
                      <button
                        onClick={() => {
                          onSelectProject(project.slug);
                          setViewMode('selected');
                        }}
                        className="text-[13px] text-black underline underline-offset-4 cursor-pointer font-normal"
                      >
                        (Photos · {totalCuts}컷 보기)
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox for Final Product Shoot Images */}
      {lightboxIndex !== null && finalShootImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="w-full max-w-5xl flex items-center justify-between text-white text-[13px] mb-3">
            <span className="font-normal">
              {targetProject?.title} — PHOTO {String(lightboxIndex + 1).padStart(2, '0')} /{' '}
              {String(finalShootImages.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="text-white/80 hover:text-white flex items-center gap-1 cursor-pointer p-1"
            >
              <span>[Close]</span>
              <X size={16} />
            </button>
          </div>

          <div
            className="relative max-w-5xl w-full max-h-[82vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-2 cursor-pointer transition-colors"
                title="이전 사진"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <img
              src={finalShootImages[lightboxIndex]}
              alt={`${targetProject?.title} Photo ${lightboxIndex + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] max-w-full object-contain bg-white"
            />

            {lightboxIndex < finalShootImages.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-2 cursor-pointer transition-colors"
                title="다음 사진"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
