import React, { useState } from 'react';
import { AboutData, ResumeData } from '../lib/types';
import { getHonorSlug } from '../lib/experienceData';

interface AboutResumeColumnProps {
  aboutData: AboutData;
  resumeData: ResumeData;
  activeProjectSlug?: string | null;
  onSelectProject?: (slug: string) => void;
}

export const AboutResumeColumn: React.FC<AboutResumeColumnProps> = ({
  aboutData,
  resumeData,
  activeProjectSlug,
  onSelectProject,
}) => {
  // 처음 접속 시에는 닫혀 있고(false), 클릭 시 내용이 나타남
  const [isOpen, setIsOpen] = useState(false);

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
                href="mailto:15682@naver.com"
                className="text-black hover:opacity-75 transition-opacity font-normal"
              >
                15682@naver.com
              </a>
            </div>
          </div>
        </div>

        {/* Bio statement */}
        <div className="text-[13px] text-black leading-relaxed">
          <p>{aboutData.bio}</p>
        </div>

        {/* Lower Gap before Resume */}
        <div className="pt-8 sm:pt-14">
          <div className="border-t border-[rgba(0,0,0,0.15)] pt-4">
            {/* Resume Header / Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-[13px] text-black hover:opacity-75 cursor-pointer underline underline-offset-4 decoration-[rgba(0,0,0,0.4)] hover:decoration-black flex items-center gap-1.5 font-normal"
              >
                <span>Resume</span>
                <span className="text-[12px] text-[rgba(0,0,0,0.4)] no-underline">
                  {isOpen ? '—' : '+'}
                </span>
              </button>
            </div>

            {/* Expandable Resume Content (좌측 탭 여유로운 너비로 텍스트 줄바꿈 방지) */}
            {isOpen && (
              <div className="mt-5 space-y-6 text-[13px] animate-in fade-in duration-200">
                {/* 1. 교육 */}
                <div className="space-y-2 pb-4 border-b border-[rgba(0,0,0,0.1)]">
                  <div className="text-[13px] font-bold text-black">
                    교육
                  </div>
                  {(resumeData?.education || []).map((edu, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline text-[13px] gap-0.5 sm:gap-2">
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
                      <div className="text-[13px] font-bold text-black">
                        경력
                      </div>
                      <span className="text-[12px] sm:text-[12.5px] text-[rgba(0,0,0,0.5)] whitespace-nowrap">
                        {resumeData?.totalExperience || '총 6년 2개월'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {resumeData.experience.map((exp, idx) => (
                        <div key={idx} className="space-y-1.5 text-[13px]">
                          {/* Company, Role, Period */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <span className="font-normal text-black">
                              {exp?.company} · {exp?.role}
                            </span>
                            <span className="text-[12px] sm:text-[12.5px] text-[rgba(0,0,0,0.5)] whitespace-nowrap">
                              {exp?.period}
                            </span>
                          </div>

                          {/* Task bullets */}
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
                      <div className="text-[13px] font-bold text-black">
                        경험
                      </div>
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
                            className={`flex justify-between items-baseline text-[13px] leading-snug gap-2 group cursor-pointer py-1 px-1.5 -mx-1.5 rounded transition-all ${
                              isActive
                                ? 'bg-neutral-900 text-white shadow-xs'
                                : 'hover:bg-neutral-100 text-black'
                            }`}
                            title={isActive ? '클릭하여 세부 페이지 닫기' : '클릭하여 More 탭에서 세부 아카이브 보기'}
                          >
                            <span
                              className={`font-normal pr-1 transition-colors ${
                                isActive
                                  ? 'text-white font-medium'
                                  : 'text-black group-hover:underline decoration-[rgba(0,0,0,0.4)]'
                              }`}
                            >
                              {honor?.title}
                            </span>
                            <span
                              className={`text-[12px] sm:text-[12.5px] whitespace-nowrap shrink-0 transition-colors ${
                                isActive ? 'text-neutral-300' : 'text-[rgba(0,0,0,0.5)]'
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
                  <div className="text-[13px] font-bold text-black">
                    자격 및 능력
                  </div>
                  <div className="space-y-1 text-[13px] leading-relaxed">
                    {Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0 && (
                      <div className="text-black font-normal">{resumeData.certifications.join(', ')}</div>
                    )}
                    <div className="text-black font-normal">
                      {(Array.isArray(resumeData?.skills) ? resumeData.skills : []).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
