import React from 'react';
import { AboutData } from '../lib/types';
import { VisualFrame } from './VisualFrame';

interface AboutViewProps {
  data: AboutData;
  onNavigateToWork?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ data, onNavigateToWork }) => {
  return (
    <section className="py-6 sm:py-12">
      {/* 2-Column Grid: Left Profile Image, Right Text Info */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-start">
        {/* Left Column: Profile Image */}
        <div className="md:col-span-5">
          <div className="border border-[rgba(0,0,0,0.15)] overflow-hidden">
            <VisualFrame
              src={data.profileImage}
              alt={data.name}
              type="profile"
              aspectRatio="1:1"
            />
          </div>
          <div className="mt-3 text-[12px] text-[rgba(0,0,0,0.45)] flex justify-between font-mono">
            <span>PORTRAIT / 2026</span>
            <span>SEOUL, KR</span>
          </div>
        </div>

        {/* Right Column: Name, Role, Location, Bio, Contacts */}
        <div className="md:col-span-7 flex flex-col justify-start">
          {/* Name */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black mb-1">
            {data.name}
          </h1>

          {/* Role / Location */}
          <div className="text-[15px] sm:text-[16px] text-[rgba(0,0,0,0.6)] mb-6 font-normal">
            {data.role} · {data.location}
          </div>

          {/* Bio text */}
          <div className="text-[15px] sm:text-[16px] leading-[1.75] text-[rgba(0,0,0,0.85)] space-y-4 mb-8">
            <p>{data.bio}</p>
            <p className="text-[rgba(0,0,0,0.65)] text-[14px] sm:text-[15px]">
              단순한 심미성을 넘어, 소재의 물성과 제작 공차, 디지털 논리가 유기적으로 맞물리는 미니멀한 제품 및 인터페이스를 탐구합니다. 현재 서울을 기반으로 활동하며 독립적인 실험과 클라이언트 프로젝트를 병행하고 있습니다.
            </p>
          </div>

          {/* Hairline division */}
          <hr className="border-t border-[rgba(0,0,0,0.15)] mb-6" />

          {/* Contact Links */}
          <div className="space-y-2 text-[14px] sm:text-[15px]">
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[rgba(0,0,0,0.4)] text-[13px]">Email</span>
              <a
                href={`mailto:${data.contact.email}`}
                className="text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black transition-colors"
              >
                {data.contact.email}
              </a>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[rgba(0,0,0,0.4)] text-[13px]">Instagram</span>
              <a
                href={`https://instagram.com/${data.contact.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black transition-colors"
              >
                {data.contact.instagram}
              </a>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[rgba(0,0,0,0.4)] text-[13px]">LinkedIn</span>
              <a
                href={data.contact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black transition-colors"
              >
                linkedin.com/in/leehyejun
              </a>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[rgba(0,0,0,0.4)] text-[13px]">GitHub</span>
              <a
                href={data.contact.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black transition-colors"
              >
                github.com/leehyejun
              </a>
            </div>
          </div>

          {/* Quick link to selected works */}
          {onNavigateToWork && (
            <div className="mt-10 pt-4">
              <button
                onClick={onNavigateToWork}
                className="text-[14px] font-medium text-black border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                View Selected Works →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
