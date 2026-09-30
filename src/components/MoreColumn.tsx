import React, { useRef, useEffect } from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';
import { MdxContent } from './MdxContent';

interface MoreColumnProps {
  activeProject: WorkProject | null;
  onClearActiveProject: () => void;
}

export const MoreColumn: React.FC<MoreColumnProps> = ({
  activeProject,
  onClearActiveProject,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when active project changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeProject?.slug]);

  // If no project is selected
  if (!activeProject) {
    return (
      <div className="w-full flex flex-col bg-white">
        {/* Empty column top border matching About and Work */}
        <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
          <span className="text-[13px] text-[rgba(0,0,0,0.4)] font-normal">More</span>
        </div>
        <div className="p-6 text-[13px] text-[rgba(0,0,0,0.4)] font-normal leading-relaxed">
          중간 Work 목록에서 <span className="text-black">(More..)</span>를 클릭하면 해당 프로젝트의 상세 사양 및 세부 사진이 이 공간에 표시됩니다.
        </div>
      </div>
    );
  }

  // Has custom detail images uploaded by user?
  const detailImages = activeProject.images && activeProject.images.length > 0 ? activeProject.images : [];

  return (
    <div ref={scrollContainerRef} className="w-full flex flex-col bg-white">
      {/* Column Header: Top aligned with About & Work */}
      <div className="h-9 px-4 sm:px-6 flex items-center justify-between border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
        <span className="text-[13px] text-black font-normal">More</span>
        <button
          onClick={onClearActiveProject}
          className="text-[12px] text-[rgba(0,0,0,0.4)] hover:text-black font-normal cursor-pointer"
          title="Close details"
        >
          [Close]
        </button>
      </div>

      {/* Main Project Content Body (2-column layout matching image) */}
      <div className="p-4 sm:p-6 space-y-8">
        {/* Top 2-Column Info: 좌측 프로젝트명(font-size: 15px), 우측 스펙 및 본문 설명 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-[13px] leading-relaxed font-normal">
          {/* Left Column: Title (CSS selector 8: font-size: 15px) */}
          <div className="md:col-span-4">
            <h2
              className="text-[15px] font-normal text-black tracking-normal leading-snug"
              style={{ fontSize: '15px' }}
            >
              {activeProject.title}
            </h2>
          </div>

          {/* Right Column: Specs + Narrative Prose */}
          <div className="md:col-span-8 space-y-4 text-[13px] font-normal text-black">
            {/* Specs Block (CSS selectors 9 & 10: font-style: normal) */}
            <div className="space-y-0.5 pb-2">
              <div
                className="text-black font-normal not-italic"
                style={{ fontStyle: 'normal' }}
              >
                {activeProject.materials}
              </div>
              <div className="text-black font-normal">
                {activeProject.dimensions}
              </div>
              <div
                className="text-black font-normal not-italic"
                style={{ fontStyle: 'normal' }}
              >
                {activeProject.date}
              </div>
            </div>

            {/* Narrative text (13px font-normal) */}
            <div className="space-y-4 text-[13px] font-normal leading-[1.65] text-black">
              <MdxContent content={activeProject.content} />
            </div>
          </div>
        </div>

        {/* Photos Heading */}
        <div className="pt-2 border-t border-[rgba(0,0,0,0.08)]">
          <div className="text-[13px] font-normal text-black mb-4">Photos</div>

          {/* Photos Gallery: Renders detail images uploaded in Admin, or architectural graphics */}
          <div className="space-y-5">
            {detailImages.length > 0 ? (
              detailImages.map((imgSrc, idx) => (
                <div key={idx} className="border border-[rgba(0,0,0,0.08)] overflow-hidden bg-[#F6F6F4]">
                  <VisualFrame
                    src={imgSrc}
                    alt={`${activeProject.title} Detail ${idx + 1}`}
                    aspectRatio="16:9"
                    subtitle={`DETAIL PHOTO ${String(idx + 1).padStart(2, '0')}`}
                  />
                </div>
              ))
            ) : (
              <>
                {/* Fallback default photo plates if no detail images uploaded */}
                <div className="border border-[rgba(0,0,0,0.08)] overflow-hidden bg-[#F6F6F4]">
                  <div className="w-full aspect-[16/10] flex flex-col items-center justify-center p-6 text-[#222]">
                    <svg className="w-4/5 h-4/5 max-h-[360px]" viewBox="0 0 320 200" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <polygon points="40,80 280,80 250,55 70,55" fill="rgba(240,240,240,0.7)" stroke="currentColor" strokeWidth="1.4" />
                      <line x1="40" y1="80" x2="280" y2="80" stroke="currentColor" strokeWidth="1.6" />
                      <line x1="60" y1="80" x2="55" y2="185" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="55" cy="187" r="3" fill="#333" />
                      <line x1="85" y1="58" x2="80" y2="155" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
                      <line x1="260" y1="80" x2="265" y2="185" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="265" cy="187" r="3" fill="#333" />
                      <line x1="235" y1="58" x2="240" y2="155" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
                      <line x1="60" y1="120" x2="75" y2="150" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="75" y1="150" x2="55" y2="180" stroke="currentColor" strokeWidth="1" />
                      <line x1="260" y1="120" x2="245" y2="150" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="245" y1="150" x2="265" y2="180" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                </div>

                <div className="border border-[rgba(0,0,0,0.08)] overflow-hidden">
                  <VisualFrame
                    src={activeProject.thumbnail}
                    alt={activeProject.title}
                    aspectRatio="16:9"
                    subtitle="PLATE 02 / ELEVATION"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
