import React from 'react';
import { WorkProject } from '../lib/types';
import { VisualFrame } from './VisualFrame';
import { MdxContent } from './MdxContent';
import { ArrowLeft, ExternalLink, ArrowRight } from 'lucide-react';

interface WorkDetailViewProps {
  project: WorkProject;
  allProjects: WorkProject[];
  onBack: () => void;
  onSelectProject: (slug: string) => void;
}

export const WorkDetailView: React.FC<WorkDetailViewProps> = ({
  project,
  allProjects,
  onBack,
  onSelectProject,
}) => {
  const currentIndex = allProjects.findIndex((p) => p.slug === project.slug);
  const nextProject =
    currentIndex !== -1 && currentIndex < allProjects.length - 1
      ? allProjects[currentIndex + 1]
      : null;
  const prevProject =
    currentIndex > 0 ? allProjects[currentIndex - 1] : null;

  const formattedOrder = String(project.order || currentIndex + 1).padStart(2, '0');

  return (
    <article className="py-6 sm:py-12 max-w-4xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Back to Work</span>
      </button>

      {/* Header Info */}
      <header className="mb-8">
        <div className="text-[13px] font-mono text-[rgba(0,0,0,0.45)] mb-1">
          PROJECT {formattedOrder} · {project.date}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black mb-4">
          {project.title}
        </h1>

        {/* Spec Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4 border-y border-[rgba(0,0,0,0.15)] text-[14px]">
          <div>
            <div className="text-[12px] text-[rgba(0,0,0,0.4)]">Materials</div>
            <div className="font-medium text-black mt-0.5">{project.materials}</div>
          </div>
          <div>
            <div className="text-[12px] text-[rgba(0,0,0,0.4)]">Dimensions</div>
            <div className="font-medium text-black mt-0.5">{project.dimensions}</div>
          </div>
          <div>
            <div className="text-[12px] text-[rgba(0,0,0,0.4)]">Year</div>
            <div className="font-medium text-black mt-0.5">{project.date}</div>
          </div>
        </div>
      </header>

      {/* Primary Image / Hero Media */}
      <div className="mb-10 border border-[rgba(0,0,0,0.12)] overflow-hidden">
        <VisualFrame
          src={project.thumbnail}
          alt={project.title}
          aspectRatio="16:9"
          subtitle={`${project.title} · MAIN HERO`}
        />
      </div>

      {/* Additional Gallery Images if available */}
      {project.images && project.images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {project.images.map((img, i) => (
            <div key={i} className="border border-[rgba(0,0,0,0.1)] overflow-hidden">
              <VisualFrame
                src={img}
                alt={`${project.title} detail ${i + 1}`}
                aspectRatio="4:3"
                subtitle={`DETAIL ${String(i + 1).padStart(2, '0')}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* MDX Body Content */}
      <div className="py-4">
        <MdxContent content={project.content} />
      </div>

      {/* External Link (Only for experience/award references) */}
      {((project.order && project.order >= 100) || project.slug?.includes('poing')) && project.externalUrl && (
        <div className="mt-8 pt-6 border-t border-[rgba(0,0,0,0.15)]">
          <a
            href={project.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-black border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
          >
            <span>Visit Project Reference</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Next / Previous Project Pagination */}
      <nav className="mt-16 pt-8 border-t border-[rgba(0,0,0,0.15)] flex items-center justify-between">
        <div>
          {prevProject ? (
            <button
              onClick={() => onSelectProject(prevProject.slug)}
              className="text-left group cursor-pointer"
            >
              <div className="text-[12px] text-[rgba(0,0,0,0.4)] flex items-center gap-1">
                <ArrowLeft size={12} /> Previous Project
              </div>
              <div className="text-[15px] font-medium text-black group-hover:underline">
                {prevProject.title}
              </div>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div>
          {nextProject ? (
            <button
              onClick={() => onSelectProject(nextProject.slug)}
              className="text-right group cursor-pointer"
            >
              <div className="text-[12px] text-[rgba(0,0,0,0.4)] flex items-center justify-end gap-1">
                Next Project <ArrowRight size={12} />
              </div>
              <div className="text-[15px] font-medium text-black group-hover:underline">
                {nextProject.title}
              </div>
            </button>
          ) : (
            <div />
          )}
        </div>
      </nav>
    </article>
  );
};
