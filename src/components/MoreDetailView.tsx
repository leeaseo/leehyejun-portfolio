import React from 'react';
import { PostItem } from '../lib/types';
import { MdxContent } from './MdxContent';
import { ArrowLeft, Download } from 'lucide-react';

interface MoreDetailViewProps {
  post: PostItem;
  onBack: () => void;
}

export const MoreDetailView: React.FC<MoreDetailViewProps> = ({
  post,
  onBack,
}) => {
  const handleAttachmentClick = (fileName: string) => {
    const blob = new Blob(
      [`Lee Hye Jun — Archive Document\nArticle: ${post.title}\nAttachment: ${fileName}\nDate: ${post.date}\n\n[Full PDF attachment content for Lee Hye Jun portfolio]`],
      { type: 'application/pdf' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <article className="py-6 sm:py-12 max-w-3xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Back to Writing</span>
      </button>

      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black mb-3">
          {post.title}
        </h1>

        <div className="text-[13px] text-[rgba(0,0,0,0.5)] flex items-center gap-2 pb-6 border-b border-[rgba(0,0,0,0.15)]">
          <span>{post.date}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{post.category}</span>
          <span aria-hidden="true">·</span>
          <span>By Lee Hye Jun</span>
        </div>
      </header>

      {/* Attachments banner if present */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mb-8 p-4 bg-[#FBFBFA] border border-[rgba(0,0,0,0.12)]">
          <div className="text-[12px] font-medium text-[rgba(0,0,0,0.6)] uppercase tracking-wider mb-2">
            Attached Documents
          </div>
          <div className="flex flex-wrap gap-2.5">
            {post.attachments.map((att, idx) => (
              <button
                key={idx}
                onClick={() => handleAttachmentClick(att.name)}
                className="inline-flex items-center gap-2 text-[13px] text-black bg-white border border-[rgba(0,0,0,0.2)] px-3 py-1.5 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-[rgba(0,0,0,0.6)]" />
                <span>{att.name}</span>
                {att.size && (
                  <span className="text-[11px] text-[rgba(0,0,0,0.4)]">
                    ({att.size})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MDX Body Content */}
      <div className="py-2">
        <MdxContent content={post.content} />
      </div>

      {/* Footer Navigation */}
      <div className="mt-16 pt-8 border-t border-[rgba(0,0,0,0.15)] flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[14px] font-medium text-black hover:underline cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>목록으로 돌아가기</span>
        </button>
      </div>
    </article>
  );
};
