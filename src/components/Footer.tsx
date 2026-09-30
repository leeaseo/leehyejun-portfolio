import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[rgba(0,0,0,0.15)] bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-baseline justify-between gap-2 text-[13px] text-[rgba(0,0,0,0.6)]">
        <div>© Lee Hye Jun 2026</div>
        <div className="text-[12px] text-[rgba(0,0,0,0.4)]">
          Product Designer · Seoul, KR
        </div>
      </div>
    </footer>
  );
};
