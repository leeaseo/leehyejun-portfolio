import React, { useState } from 'react';
import { AboutData, ResumeData, WorkProject } from '../lib/types';
import { getHonorSlug } from '../lib/experienceData';
import { isExperienceSlug } from '../lib/content';

interface AboutResumeColumnProps {
  aboutData: AboutData;
  resumeData: ResumeData;
  projects?: WorkProject[];
  activeProjectSlug?: string | null;
  onSelectProject?: (slug: string) => void;
}

export const AboutResumeColumn: React.FC<AboutResumeColumnProps> = ({
  aboutData,
  resumeData,
  projects = [],
  activeProjectSlug,
  onSelectProject,
}) => {
  // Resume: 처음 접속 시 닫혀 있고(false), 클릭 시 열림
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  // Work: 좌측 컬럼으로 이동된 Work 탭 (기본 열림 상태로 바로 프로젝트 탐색 가능, + / — 토글 지원)
  const [isWorkOpen, setIsWorkOpen] = useState(true);

  const workProjects = (projects || []).filter(
    (p) => Boolean(p && p.slug && !isExperienceSlug(p.slug) && (!p.order || p.order < 100))
  );

  return (
    <div className="w-full flex flex-col bg-white select-text">
      {/* Column Header: About */}
      <div className="h-9 px-4 sm:px-6 flex items-center border-b border-[rgba(0,0,0,0.15)] bg-white sticky top-0 z-10">
        <span className="text-[13px] text-black font-normal">About</span>
      </div>

      {/* About Section Body */}
      <div className="px-4 sm:px-6 py-5 space-y-6">
        {/* Info Grid: 좌측정렬로 열맞춤 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[13px] leading-relaxed">
          {/* Column 1: Role & Location */}
          <div className="space-y-0.5 text-left">
            <div className="text-black font-bold">{aboutData.role || 'Furniture Designer'}</div>
            <div className="text-black font-normal">{aboutData.location}</div>
          </div>

          {/* Column 2: Lee Hye Jun & Email */}
          <div className="space-y-0.5 text-left">
            <div className="text-black font-bold">Lee Hye Jun</div>
            <div>
              <a
                href={`mailto:${aboutData?.contact?.email || '15682@naver.com'}`}
                className="text-black hover:opacity-75 transition-opacity font-normal"
              >
                {aboutData?.contact?.email || '15682@naver.com'}
              </a>
            </div>
          </div>
        </div>

        {/* Bio statement */}
        <div className="text-[13px] text-black leading-relaxed">
          <p>{aboutData.bio}</p>
        </div>

        {/* 1. Resume Section — 상하 가로선 사이 여백 균등(세로 중앙 정렬) */}
        <div className="pt-4">
          <div className="border-t border-[rgba(0,0,0,0.15)] py-4">
            {/* Resume Header / Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsResumeOpen(!isResumeOpen)}
                className="text-[13px] text-black hover:opacity-75 cursor-pointer underline underline-offset-4 decoration-[rgba(0,0,0,0.4)] hover:decoration-black flex items-center gap-1.5 font-normal leading-none"
              >
                <span>Resume</span>
                <span className="text-[12px] text-[rgba(0,0,0,0.4)] no-underline">
                  {isResumeOpen ? '—' : '+'}
                </span>
              </button>
            </div>

            {/* Expandable Resume Content */}
            {isResumeOpen && (
              <div className="mt-5 space-y-6 text-[13px] animate-in fade-in duration-200">
                {/* 1. 교육 */}
                <div className="space-y-2 pb-4 border-b border-[rgba(0,0,0,0.1)]">
                  <div className="text-[13px] font-bold text-black">교육</div>
                  {(resumeData?.education || []).map((edu, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline text-[13px] gap-0.5 sm:gap-2"
                    >
                      <span className="text-black font-normal">
                        {edu.school} {edu.major}
                      </span>
                      <span className="text-[12px] sm:text-[12.5px] text-[rgba(0,0,0,0.5)] whitespace-nowrap">
                        ({edu.period})
                      </span>
                    </div>
                  ))}
                </div>

                {/* 2. 경력 */}
                {Array.isArray(resumeData?.experience) && resumeData.experience.length > 0 && (
                  <div className="space-y-4 pb-4 border-b border-[rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-baseline">
                      <div className="text-[13px] font-bold text-black">경력</div>
                      <span className="text-[12px] sm:text-[12.5px] text-[rgba(0,0,0,0.5)] whitespace-nowrap">
                        {resumeData?.totalExperience || '총 6년 2개월'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {resumeData.experience.map((exp, idx) => (
                        <div key={idx} className="space-y-1.5 text-[13px]">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <span className="font-normal text-black">
                              {exp?.company} · {exp?.role}
                            </span>
                            <span className="text-[12px] sm:text-[12.5px] text-[rgba(0,0,0,0.5)] whitespace-nowrap">
                              {exp?.period}
                            </span>
                          </div>

                          {Array.isArray(exp?.tasks) && exp.tasks.length > 0 && (
                            <ul className="pl-4 space-y-1 text-[13px] text-[rgba(0,0,0,0.5)] list-disc">
                              {exp.tasks.map((task, tIdx) => (
                                <li key={tIdx} className="leading-relaxed">
                                  {task}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. 경험 */}
                {Array.isArray(resumeData?.honors) && resumeData.honors.length > 0 && (
                  <div className="space-y-2 pb-4 border-b border-[rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-baseline">
                      <div className="text-[13px] font-bold text-black">경험</div>
                      <span className="text-[11px] text-[rgba(0,0,0,0.35)]">
                        (클릭 시 세부 아카이브 표시)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(resumeData.honors || []).map((honor, idx) => {
                        const slug = getHonorSlug(honor?.title || '', idx);
                        const isActive = activeProjectSlug === slug;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (onSelectProject) {
                                if (isActive) {
                                  onSelectProject('__closed__');
                                } else {
                                  onSelectProject(slug);
                                }
                              }
                            }}
                            className="flex justify-between items-baseline text-[13px] leading-snug gap-2 group cursor-pointer py-1 transition-opacity"
                            title={
                              isActive
                                ? '클릭하여 세부 페이지 닫기'
                                : '클릭하여 More 탭에서 세부 아카이브 보기'
                            }
                          >
                            <span
                              className={`pr-1 transition-colors text-black ${
                                isActive
                                  ? 'underline underline-offset-4 decoration-black font-medium'
                                  : 'font-normal group-hover:underline underline-offset-4 decoration-[rgba(0,0,0,0.4)]'
                              }`}
                            >
                              {honor?.title}
                            </span>
                            <span
                              className={`text-[12px] sm:text-[12.5px] whitespace-nowrap shrink-0 transition-colors ${
                                isActive ? 'text-black font-medium' : 'text-[rgba(0,0,0,0.5)]'
                              }`}
                            >
                              ({honor?.period})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. 자격 및 능력 */}
                <div className="space-y-2">
                  <div className="text-[13px] font-bold text-black">자격 및 능력</div>
                  <div className="space-y-1 text-[13px] leading-relaxed">
                    {Array.isArray(resumeData.certifications) &&
                      resumeData.certifications.length > 0 && (
                        <div className="text-black font-normal">
                          {resumeData.certifications.join(', ')}
                        </div>
                      )}
                    <div className="text-black font-normal">
                      {(Array.isArray(resumeData?.skills) ? resumeData.skills : []).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Work Section — 설명란(materials) 일괄 삭제, 클릭 시 검은 배경 대신 밑줄로만 깔끔하게 표시 */}
          <div className="border-t border-[rgba(0,0,0,0.15)] pt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsWorkOpen(!isWorkOpen)}
                className="text-[13px] text-black hover:opacity-75 cursor-pointer underline underline-offset-4 decoration-[rgba(0,0,0,0.4)] hover:decoration-black flex items-center gap-1.5 font-normal leading-none"
                aria-expanded={isWorkOpen}
              >
                <span>Work</span>
                <span className="text-[12px] text-[rgba(0,0,0,0.4)] no-underline">
                  {isWorkOpen ? '—' : '+'}
                </span>
              </button>
              <span className="text-[11px] text-[rgba(0,0,0,0.4)] font-mono tabular-nums">
                ({workProjects.length})
              </span>
            </div>

            {isWorkOpen && (
              <div className="mt-4 divide-y divide-[rgba(0,0,0,0.08)] border-t border-[rgba(0,0,0,0.15)] animate-in fade-in duration-200">
                {workProjects.map((project, index) => {
                  const formattedIndex = String(project.order || index + 1).padStart(2, '0');
                  const isActive = activeProjectSlug === project.slug;

                  return (
                    <div
                      key={project.slug}
                      onClick={() => onSelectProject?.(project.slug)}
                      className="py-3 cursor-pointer transition-colors group flex items-center justify-between gap-2 text-[13px] text-black"
                    >
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span
                          className={`text-[12px] font-mono tabular-nums shrink-0 transition-colors ${
                            isActive
                              ? 'text-black font-medium'
                              : 'text-[rgba(0,0,0,0.4)] group-hover:text-black'
                          }`}
                        >
                          {formattedIndex}.
                        </span>
                        <span
                          className={`truncate text-black ${
                            isActive
                              ? 'underline underline-offset-4 decoration-black font-medium'
                              : 'font-normal group-hover:underline underline-offset-4 decoration-[rgba(0,0,0,0.4)]'
                          }`}
                        >
                          {project.title}
                        </span>
                      </div>
                      <span
                        className={`text-[11.5px] font-mono tabular-nums shrink-0 transition-colors ${
                          isActive ? 'text-black font-medium' : 'text-[rgba(0,0,0,0.45)]'
                        }`}
                      >
                        {project.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
