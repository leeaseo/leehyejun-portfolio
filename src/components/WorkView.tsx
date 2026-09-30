import React from 'react';
import { WorkProject } from '../lib/types';
import { ProjectCard } from './ProjectCard';

interface WorkViewProps {
  projects: WorkProject[];
  onSelectProject: (slug: string) => void;
}

export const WorkView: React.FC<WorkViewProps> = ({
  projects,
  onSelectProject,
}) => {
  return (
    <section className="py-6 sm:py-12">
      {/* Work Section Intro */}
      <div className="mb-10 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mb-2">
          Selected Works
        </h1>
        <p className="text-[15px] text-[rgba(0,0,0,0.6)]">
          하드웨어 인터페이스, 모듈러 시스템, 촉각적 제품 디자인 아카이브.
        </p>
      </div>

      {/* Projects List */}
      <div>
        {projects.map((project, index) => (
          <ProjectCard
            key={project.slug}
            project={project}
            index={index}
            onSelectProject={onSelectProject}
          />
        ))}
      </div>
    </section>
  );
};
