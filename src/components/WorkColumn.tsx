import React from 'react';
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
  return (
    <div className="w-full flex flex-col bg-white">
      {/* Column Header: Work */}
      <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10 shrink-0">
        <span className="text-[13px] text-black font-normal">Work</span>
      </div>

      {/* Projects Feed */}
      <div className="divide-y divide-[rgba(0,0,0,0.15)]">
        {projects.map((project, index) => {
          const formattedIndex = String(project.order || index + 1).padStart(2, '0');
          const isActive = activeSlug === project.slug;

          return (
            <article
              key={project.slug}
              className={`p-4 sm:p-6 transition-colors ${
                isActive ? 'bg-[#FCFCFB]' : 'bg-white'
              }`}
            >
              {/* Main Product Image Container (Large framing as seen in capture image) */}
              <div
                onClick={() => onSelectProject(project.slug)}
                className="cursor-pointer mb-5 overflow-hidden flex items-center justify-center border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.2)] transition-colors"
              >
                <div className="w-full">
                  <VisualFrame
                    src={project.thumbnail}
                    alt={project.title}
                    aspectRatio="3:4"
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
