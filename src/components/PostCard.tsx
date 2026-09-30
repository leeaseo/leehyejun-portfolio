import React from 'react';
import { PostItem } from '../lib/types';
import { Download } from 'lucide-react';

interface PostCardProps {
  post: PostItem;
  onSelectPost: (slug: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onSelectPost }) => {
  const handleAttachmentClick = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    // Trigger virtual file download for attachments
    const blob = new Blob([`Document: ${fileName}\nAuthor: Lee Hye Jun\nDate: ${post.date}\nPortfolio Attachment`], {
      type: 'application/pdf',
    });
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
    <article className="mb-10 sm:mb-12">
      {/* Post title */}
      <h2
        onClick={() => onSelectPost(post.slug)}
        className="text-[18px] sm:text-[20px] font-bold tracking-tight text-black cursor-pointer hover:opacity-75 transition-opacity"
      >
        {post.title}
      </h2>

      {/* Date & category (unboxed metadata) */}
      <div className="mt-1 mb-3 text-[13px] text-[rgba(0,0,0,0.5)] flex items-center gap-2">
        <span>{post.date}</span>
        <span aria-hidden="true">·</span>
        <span className="capitalize">{post.category}</span>
      </div>

      {/* Excerpt */}
      <p
        onClick={() => onSelectPost(post.slug)}
        className="text-[15px] sm:text-[16px] leading-relaxed text-[rgba(0,0,0,0.7)] cursor-pointer"
      >
        {post.excerpt}
      </p>

      {/* Attachments download if present */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {post.attachments.map((att, idx) => (
            <button
              key={idx}
              onClick={(e) => handleAttachmentClick(e, att.name)}
              className="inline-flex items-center gap-1.5 text-[13px] text-black border border-[rgba(0,0,0,0.2)] px-3 py-1.5 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <Download size={14} className="text-[rgba(0,0,0,0.6)]" />
              <span>{att.name}</span>
              {att.size && (
                <span className="text-[12px] text-[rgba(0,0,0,0.4)]">({att.size})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Read more button link */}
      <div className="mt-4">
        <button
          onClick={() => onSelectPost(post.slug)}
          className="text-[14px] text-black underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black cursor-pointer"
        >
          Read article →
        </button>
      </div>

      {/* Hairline divider */}
      <hr className="mt-10 sm:mt-12 border-t border-[rgba(0,0,0,0.15)]" />
    </article>
  );
};
