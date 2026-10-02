import React, { useState } from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';

interface WorkColumnProps {
  projects: WorkProject[];
  activeSlug: string | null;
  onSelectProject: (slug: string) => void;
}

export const WorkColumn: React.FC<WorkColumnProps> = ({
  projects,
  activeSlug,
  onSelectProject,
}) => {
  const [isIndexOpen, setIsIndexOpen] = useState(false);

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Column Header: Work with + toggle like Resume */}
      <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-20 shrink-0">
        <button
          onClick={() => setIsIndexOpen(!isIndexOpen)}
          className="text-[13px] text-black hover:opacity-75 cursor-pointer underline underline-offset-4 decoration-[rgba(0,0,0,0.4)] hover:decoration-black flex items-center gap-1.5 font-normal transition-opacity"
          aria-expanded={isIndexOpen}
          title="Work 목록 열기/닫기"
        >
          <span>Work</span>
          <span className="text-[12px] text-[rgba(0,0,0,0.4)] no-underline">
            {isIndexOpen ? '—' : '+'}
          </span>
        </button>
      </div>

      {/* Expandable Project List without background color */}
      {isIndexOpen && (
        <div className="bg-white border-b border-[rgba(0,0,0,0.15)] px-4 sm:px-6 py-3 sticky top-9 z-10 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="divide-y divide-[rgba(0,0,0,0.06)]">
            {(projects || []).filter(Boolean).map((project, index) => {
              const formattedIndex = String(project.order || index + 1).padStart(2, '0');
              const isActive = activeSlug === project.slug;

              return (
                <button
                  key={project.slug}
                  onClick={() => {
                    onSelectProject(project.slug);
                    const el = document.getElementById(`project-${project.slug}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-full py-2 flex items-center justify-between text-[13px] text-left transition-colors group cursor-pointer ${
                    isActive ? 'font-medium text-black' : 'text-[rgba(0,0,0,0.7)] hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[12px] text-[rgba(0,0,0,0.35)] group-hover:text-black font-mono">
                      {formattedIndex}.
                    </span>
                    <span className={`truncate ${isActive ? 'underline underline-offset-4 text-black' : 'group-hover:underline'}`}>
                      {project.title}
                    </span>
                  </div>
                  <span className="text-[12px] text-[rgba(0,0,0,0.4)] whitespace-nowrap pl-2">
                    {project.date}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects Feed */}
      <div className="divide-y divide-[rgba(0,0,0,0.15)]">
        {(projects || []).filter(Boolean).map((project, index) => {
          const formattedIndex = String(project.order || index + 1).padStart(2, '0');
          const isActive = activeSlug === project.slug;

          return (
            <article
              key={project.slug}
              id={`project-${project.slug}`}
              className={`p-4 sm:p-6 transition-colors ${
                isActive ? 'bg-[#FCFCFB]' : 'bg-white'
              }`}
            >
              {/* Main Product Image Container (Natural aspect ratio: 100% uncropped) */}
              <div
                onClick={() => onSelectProject(project.slug)}
                className="cursor-pointer mb-5 overflow-hidden flex items-center justify-center border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.2)] transition-colors bg-[#FAF9F6]"
              >
                <div className="w-full">
                  <VisualFrame
                    src={project.thumbnail}
                    alt={project.title}
                    aspectRatio="auto"
                    subtitle={`${formattedIndex} / ${project.date}`}
                  />
                </div>
              </div>

              {/* 2-Column Specs Layout matching the capture image and CSS focus rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] leading-relaxed mb-2 font-normal">
                {/* Left: Project Number and Title (CSS selector 6: font-size: 15px; font-weight: normal) */}
                <div
                  onClick={() => onSelectProject(project.slug)}
                  className="font-normal text-black cursor-pointer hover:underline text-[15px] leading-snug"
                  style={{ fontSize: '15px', fontWeight: 'normal' }}
                >
                  {formattedIndex}. {project.title}
                </div>

                {/* Right: Materials, Dimensions, Year & (More..) (CSS selectors 1-4: text-align: left, font-style: normal) */}
                <div className="text-black text-left space-y-1 text-[13px] font-normal" style={{ textAlign: 'left' }}>
                  <div
                    className="text-black font-normal text-left"
                    style={{
                      marginTop: '0px',
                      paddingLeft: '0px',
                      textAlign: 'left',
                      fontStyle: 'normal',
                      fontWeight: 'normal',
                    }}
                  >
                    {project.materials}
                  </div>
                  <div
                    className="text-black font-normal text-left"
                    style={{ textAlign: 'left' }}
                  >
                    {project.dimensions}
                  </div>
                  <div
                    className="text-black font-normal text-left"
                    style={{ textAlign: 'left' }}
                  >
                    {project.date}
                  </div>

                  {/* (More..) Link formatted with text-align: left */}
                  <div className="pt-2 text-left" style={{ textAlign: 'left' }}>
                    <button
                      onClick={() => onSelectProject(project.slug)}
                      className={`text-[13px] cursor-pointer transition-colors font-normal text-left ${
                        isActive
                          ? 'text-black underline underline-offset-4 decoration-black'
                          : 'text-[rgba(0,0,0,0.65)] hover:text-black underline underline-offset-4'
                      }`}
                      style={{ textAlign: 'left' }}
                    >
                      (More..)
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
