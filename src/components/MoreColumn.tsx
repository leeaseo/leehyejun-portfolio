import React, { useRef, useEffect, useState } from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';
import { MdxContent } from './MdxContent';
import { compressImageFile } from '../lib/imageCompressor';
import { saveExperienceProject, saveCustomProject, getAllProjects, getExperienceProjects, syncToServer } from '../lib/content';
import { savePortfolioToFirestore } from '../lib/firebase';
import { Upload, Plus, Loader2 } from 'lucide-react';

interface MoreColumnProps {
  activeProject: WorkProject | null;
  onClearActiveProject: () => void;
  onEditProject?: (project: WorkProject) => void;
  onProjectUpdated?: (updatedProject: WorkProject) => void;
}

export const MoreColumn: React.FC<MoreColumnProps> = ({
  activeProject,
  onClearActiveProject,
  onEditProject,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when active project changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeProject?.slug]);

  // Current active project to render - directly reactive to props
  const project = activeProject;

  // If no project is selected
  if (!project) {
    return (
      <div className="w-full flex flex-col bg-white">
        {/* Empty column top border matching About and Work */}
        <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
          <span className="text-[13px] text-[rgba(0,0,0,0.4)] font-normal">More</span>
        </div>
        <div className="p-6 text-[13px] text-[rgba(0,0,0,0.4)] font-normal leading-relaxed">
          중간 Work 목록 또는 좌측 Resume의 경험 항목을 클릭하면 해당 프로젝트의 상세 사양 및 세부 스토리가 이 공간에 표시됩니다.
        </div>
      </div>
    );
  }

  // Has custom detail images uploaded by user?
  const detailImages = Array.isArray(project.images) ? project.images : [];
  const isExperience =
    (project.order && project.order >= 100) ||
    project.slug.includes('poing') ||
    project.slug.includes('como') ||
    project.slug.includes('librat') ||
    project.slug.includes('convenset');

  const hasPhotosPlaceholder = project.content.includes('[PHOTOS]');
  const photosNode = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-normal text-black">Photos</span>
          {detailImages.length > 0 && (
            <span className="text-[11px] text-[rgba(0,0,0,0.4)] font-mono">
              ({detailImages.length})
            </span>
          )}
        </div>
      </div>

      {/* Gallery list */}
      {detailImages.length > 0 ? (
        <div className="space-y-5">
          {detailImages.map((imgSrc, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="border border-[rgba(0,0,0,0.08)] overflow-hidden bg-[#FAF9F6]">
                <VisualFrame
                  src={imgSrc}
                  alt={`${project.title} Detail ${idx + 1}`}
                  aspectRatio="auto"
                  subtitle={`PHOTO ${String(idx + 1).padStart(2, '0')}`}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-[rgba(0,0,0,0.4)] py-4 font-normal">
          등록된 세부 사진이 없습니다.
        </div>
      )}
    </div>
  );

  return (
    <div ref={scrollContainerRef} className="w-full flex flex-col bg-white">
      {/* Column Header: Top aligned with About & Work */}
      <div className="h-9 px-4 sm:px-6 flex items-center justify-between border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-black font-normal">More</span>
          {isExperience && (
            <span className="text-[11px] px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded font-mono">
              Resume
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClearActiveProject}
            className="text-[12px] text-[rgba(0,0,0,0.4)] hover:text-black font-normal cursor-pointer transition-colors"
            title="Close details"
          >
            [Close]
          </button>
        </div>
      </div>

      {/* Main Project Content Body */}
      <div className="p-4 sm:p-6 space-y-8">
        {isExperience ? (
          /* Full-Width Layout for Resume Deep-Dives: 왼쪽 제목 및 상단 중복 스펙 제거 후 꽉 차게 배치 */
          <div className="w-full space-y-6 text-[13px] font-normal text-black leading-relaxed">
            <MdxContent content={project.content} photosSlot={photosNode} />
          </div>
        ) : (
          /* Standard 2-Column Info for Work projects */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-[13px] leading-relaxed font-normal">
            {/* Left Column: Title */}
            <div className="md:col-span-4 space-y-1">
              <h2
                className="text-[15px] font-normal text-black tracking-normal leading-snug"
                style={{ fontSize: '15px' }}
              >
                {project.title}
              </h2>
            </div>

            {/* Right Column: Specs + Narrative Prose */}
            <div className="md:col-span-8 space-y-4 text-[13px] font-normal text-black">
              {/* Specs Block */}
              {(project.materials || project.dimensions || project.date || project.externalUrl) && (
                <div className="space-y-0.5 pb-2">
                  {project.materials && (
                    <div className="text-black font-normal not-italic">{project.materials}</div>
                  )}
                  {project.dimensions && (
                    <div className="text-black font-normal">{project.dimensions}</div>
                  )}
                  {project.date && (
                    <div className="text-black font-normal not-italic">{project.date}</div>
                  )}
                  {isExperience && project.externalUrl && (
                    <div className="pt-1.5">
                      <a
                        href={project.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-black underline underline-offset-2 hover:opacity-75 transition-opacity"
                      >
                        <span>공식 웹사이트 / 수상 전시 링크 ↗</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Narrative text */}
              <div className="space-y-4 text-[13px] font-normal leading-[1.65] text-black">
                <MdxContent content={project.content} photosSlot={photosNode} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Photos Heading (only if not already embedded via [PHOTOS]) */}
        {!hasPhotosPlaceholder && (
          <div className="pt-2 border-t border-[rgba(0,0,0,0.08)]">
            <div className="text-[13px] font-normal text-black mb-4">Photos</div>

            {/* Photos Gallery */}
            <div className="space-y-5">
              {detailImages.length > 0 ? (
                detailImages.map((imgSrc, idx) => (
                  <div key={idx} className="border border-[rgba(0,0,0,0.08)] overflow-hidden bg-[#FAF9F6]">
                    <VisualFrame
                      src={imgSrc}
                      alt={`${project.title} Detail ${idx + 1}`}
                      aspectRatio="auto"
                      subtitle={`PHOTO ${String(idx + 1).padStart(2, '0')}`}
                    />
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-[rgba(0,0,0,0.4)] py-3 font-normal">
                  등록된 세부 사진이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
