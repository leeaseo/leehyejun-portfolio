import React, { useState } from 'react';
import { ResumeData } from '../lib/types';
import { Download, Check, Printer } from 'lucide-react';

interface ResumeViewProps {
  data: ResumeData;
}

export const ResumeView: React.FC<ResumeViewProps> = ({ data }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadPdf = () => {
    const resumeText = `LEE HYE JUN — RESUME
Product Designer · Seoul, KR
hello@leehyejun.com · https://leehyejun.com/

==================================================
1. 경력 (EXPERIENCE)
==================================================
${data.experience
  .map(
    (exp) =>
      `• ${exp.company} · ${exp.role} (${exp.period})\n` +
      (exp.tasks ? exp.tasks.map((t) => `   - ${t}`).join('\n') : '') +
      '\n'
  )
  .join('\n')}

==================================================
2. 교육 (EDUCATION)
==================================================
${data.education
  .map((edu) => `• ${edu.school} ${edu.major} (${edu.period})`)
  .join('\n')}

==================================================
3. 경험 및 수상 (HONORS & PROJECTS)
==================================================
${(data.honors || [])
  .map((h) => `• ${h.title} (${h.period})`)
  .join('\n')}

==================================================
4. 자격 및 능력 (SKILLS & CERTIFICATIONS)
==================================================
${(data.certifications || []).join(', ')}
${data.skills.join(', ')}

© Lee Hye Jun 2026. All rights reserved.
`;

    const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lee_Hye_Jun_Resume.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="py-6 sm:py-12 max-w-4xl">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[rgba(0,0,0,0.15)] gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
            Resume
          </h1>
          <p className="text-[14px] text-[rgba(0,0,0,0.5)] mt-1">
            Product Designer
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-black border border-[rgba(0,0,0,0.2)] px-3 py-1.5 hover:bg-neutral-50 transition-colors cursor-pointer"
            title="인쇄"
          >
            <Printer size={14} className="text-[rgba(0,0,0,0.6)]" />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-black px-4 py-2 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {downloaded ? <Check size={14} /> : <Download size={14} />}
            <span>{downloaded ? '다운로드 완료' : 'PDF / Text 다운로드'}</span>
          </button>
        </div>
      </div>

      {/* 1. 교육 */}
      <div className="py-6 border-b border-[rgba(0,0,0,0.15)]">
        <h2 className="text-lg font-bold tracking-tight text-black mb-4">교육</h2>
        {data.education.map((edu, idx) => (
          <div key={idx} className="flex justify-between items-baseline text-[15px]">
            <span className="text-black font-medium">{edu.school} {edu.major}</span>
            <span className="text-[rgba(0,0,0,0.5)] font-mono text-[13px]">({edu.period})</span>
          </div>
        ))}
      </div>

      {/* 2. 경험 및 수상 */}
      {data.honors && data.honors.length > 0 && (
        <div className="py-6 border-b border-[rgba(0,0,0,0.15)]">
          <h2 className="text-lg font-bold tracking-tight text-black mb-4">경험</h2>
          <div className="space-y-2">
            {data.honors.map((h, idx) => (
              <div key={idx} className="flex justify-between items-baseline text-[15px]">
                <span className="text-black">{h.title}</span>
                <span className="text-[rgba(0,0,0,0.5)] font-mono text-[13px]">({h.period})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 자격 및 능력 */}
      <div className="py-6 border-b border-[rgba(0,0,0,0.15)]">
        <h2 className="text-lg font-bold tracking-tight text-black mb-4">자격 및 능력</h2>
        <div className="space-y-1.5 text-[15px]">
          {data.certifications && (
            <div>{data.certifications.join(', ')}</div>
          )}
          <div className="text-[rgba(0,0,0,0.7)] font-mono text-[14px]">
            {data.skills.join(', ')}
          </div>
        </div>
      </div>

      {/* 4. 경력 */}
      <div className="py-8">
        <h2 className="text-lg font-bold tracking-tight text-black mb-6">경력</h2>
        <div className="space-y-8">
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[15px]">
                <span className="font-bold text-black">{exp.company} · {exp.role}</span>
                <span className="text-[rgba(0,0,0,0.5)] font-mono text-[13px]">{exp.period}</span>
              </div>
              {exp.tasks && (
                <ul className="pl-4 list-disc space-y-1 text-[14px] text-[rgba(0,0,0,0.75)]">
                  {exp.tasks.map((task, tIdx) => (
                    <li key={tIdx}>{task}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
