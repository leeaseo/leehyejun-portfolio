import React from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';

interface ProjectCardProps {
  project: WorkProject;
  index: number;
  onSelectProject: (slug: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  index,
  onSelectProject,
}) => {
  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <article className="group mb-12 sm:mb-16">
      {/* 01. 프로젝트명 */}
      <div className="mb-3 text-[17px] sm:text-[18px] font-bold tracking-tight text-black flex items-center gap-2">
        <span>{formattedIndex}.</span>
        <span>{project.title}</span>
      </div>

      {/* 대표 이미지 */}
      <div
        onClick={() => onSelectProject(project.slug)}
        className="cursor-pointer mb-5 overflow-hidden border border-[rgba(0,0,0,0.1)] transition-all hover:border-[rgba(0,0,0,0.3)]"
      >
        <VisualFrame
          src={project.thumbnail}
          alt={project.title}
          aspectRatio="16:9"
          subtitle={`${project.date} · SPEC. ${formattedIndex}`}
        />
      </div>

      {/* 2컬럼 설명: 좌측 프로젝트명, 우측 재료/규격/연도/(More..) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 pt-1 text-[14px] sm:text-[15px] leading-relaxed">
        {/* Left column (col-span-4 or 5) */}
        <div className="md:col-span-4">
          <h3
            onClick={() => onSelectProject(project.slug)}
            className="font-bold text-black cursor-pointer hover:opacity-75 transition-opacity inline-block"
          >
            {project.title}
          </h3>
        </div>

        {/* Right column (col-span-8 or 7) */}
        <div className="md:col-span-8 space-y-1 text-[rgba(0,0,0,0.6)]">
          {project.materials && (
            <div className="text-[rgba(0,0,0,0.75)]">
              {project.materials}
            </div>
          )}
          {project.dimensions && (
            <div>{project.dimensions}</div>
          )}
          <div>{project.date}</div>
          <div className="pt-2">
            <button
              onClick={() => onSelectProject(project.slug)}
              className="font-medium text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black cursor-pointer transition-colors"
            >
              (More..)
            </button>
          </div>
        </div>
      </div>

      {/* Hairline horizontal separator */}
      <hr className="mt-12 sm:mt-16 border-t border-[rgba(0,0,0,0.15)]" />
    </article>
  );
};
