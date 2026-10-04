import React from 'react';

interface MdxContentProps {
  content: string;
  className?: string;
  photosSlot?: React.ReactNode;
}

interface ParsedListItem {
  title: string;
  body: string[];
}

export const MdxContent: React.FC<MdxContentProps> = ({ content, className = '', photosSlot }) => {
  // Parse paragraphs and basic markdown constructs
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: ParsedListItem[] = [];
  let isOrderedList = false;

  const flushList = (keyPrefix: number) => {
    if (inList && listItems.length > 0) {
      if (isOrderedList) {
        elements.push(
          <ol key={`ol-${keyPrefix}`} className="list-decimal pl-5 my-4 space-y-4 text-[13px] leading-relaxed text-black">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed pl-1">
                <div className="font-semibold text-black">{parseInline(item.title)}</div>
                {item.body.length > 0 && (
                  <div className="text-[13px] text-black leading-relaxed mt-1">
                    {parseInline(item.body.join(' '))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="list-disc pl-5 my-3 space-y-1.5 text-[13px] leading-relaxed text-black">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed pl-1">
                <div>{parseInline(item.title)}</div>
                {item.body.length > 0 && (
                  <div className="text-[13px] text-black leading-relaxed mt-0.5">
                    {parseInline(item.body.join(' '))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  const parseInline = (text: string): React.ReactNode[] => {
    // Basic inline formatting: **bold**, `code`, [link](url)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)$/);
      // Link [text](url)
      const linkMatch = remaining.match(/^([\s\S]*?)\[(.+?)\]\((.+?)\)([\s\S]*)$/);
      // Code `text`
      const codeMatch = remaining.match(/^([\s\S]*?)`(.+?)`([\s\S]*)$/);

      // Find earliest match
      let earliest: 'bold' | 'link' | 'code' | null = null;
      let earliestIdx = remaining.length;

      if (boldMatch && boldMatch[1].length < earliestIdx) {
        earliest = 'bold';
        earliestIdx = boldMatch[1].length;
      }
      if (linkMatch && linkMatch[1].length < earliestIdx) {
        earliest = 'link';
        earliestIdx = linkMatch[1].length;
      }
      if (codeMatch && codeMatch[1].length < earliestIdx) {
        earliest = 'code';
        earliestIdx = codeMatch[1].length;
      }

      if (!earliest) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (earliest === 'bold' && boldMatch) {
        if (boldMatch[1]) parts.push(<span key={keyIdx++}>{boldMatch[1]}</span>);
        parts.push(<strong key={keyIdx++} className="font-semibold text-black">{boldMatch[2]}</strong>);
        remaining = boldMatch[3];
      } else if (earliest === 'link' && linkMatch) {
        if (linkMatch[1]) parts.push(<span key={keyIdx++}>{linkMatch[1]}</span>);
        parts.push(
          <a
            key={keyIdx++}
            href={linkMatch[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 decoration-[rgba(0,0,0,0.3)] hover:decoration-black transition-colors"
          >
            {linkMatch[2]}
          </a>
        );
        remaining = linkMatch[4];
      } else if (earliest === 'code' && codeMatch) {
        if (codeMatch[1]) parts.push(<span key={keyIdx++}>{codeMatch[1]}</span>);
        parts.push(
          <code key={keyIdx++} className="font-mono text-sm bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
      }
    }

    return parts;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        let nextNonEmpty = '';
        for (let j = index + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            nextNonEmpty = lines[j];
            break;
          }
        }
        if (
          nextNonEmpty &&
          (nextNonEmpty.startsWith('  ') ||
           nextNonEmpty.startsWith('\t') ||
           (isOrderedList && /^\s*\d+\.\s+/.test(nextNonEmpty)) ||
           (!isOrderedList && /^\s*[-*]\s+/.test(nextNonEmpty)))
        ) {
          return;
        }
      }
      flushList(index);
      return;
    }

    // Indented continuation line under an existing list item
    if (inList && listItems.length > 0 && (line.startsWith('  ') || line.startsWith('\t'))) {
      listItems[listItems.length - 1].body.push(trimmed);
      return;
    }

    // Photos slot placeholder
    if (trimmed === '[PHOTOS]') {
      flushList(index);
      if (photosSlot) {
        elements.push(
          <div key={`photos-${index}`} className="my-6">
            {photosSlot}
          </div>
        );
      }
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushList(index);
      elements.push(
        <div key={index} className="border-l border-[rgba(0,0,0,0.25)] pl-3 py-0.5 my-1.5 text-[12.5px] text-[rgba(0,0,0,0.7)] leading-relaxed">
          {parseInline(trimmed.replace(/^>\s*/, ''))}
        </div>
      );
      return;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      flushList(index);
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-8 mb-4">
          {parseInline(trimmed.replace(/^#\s+/, ''))}
        </h1>
      );
      return;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl font-bold tracking-tight text-black mt-7 mb-3">
          {parseInline(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
      return;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3 key={index} className="text-lg font-bold tracking-tight text-black mt-5 mb-2">
          {parseInline(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
      return;
    }

    // Unordered list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList || isOrderedList) {
        flushList(index);
        inList = true;
        isOrderedList = false;
      }
      listItems.push({
        title: trimmed.replace(/^[-*]\s+/, ''),
        body: [],
      });
      return;
    }

    // Ordered list item
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!inList || !isOrderedList) {
        flushList(index);
        inList = true;
        isOrderedList = true;
      }
      listItems.push({
        title: orderedMatch[2],
        body: [],
      });
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushList(index);
      elements.push(<hr key={index} className="my-8 border-t border-[rgba(0,0,0,0.15)]" />);
      return;
    }

    // Standard paragraph
    flushList(index);
    elements.push(
      <p key={index} className="my-3 text-[13px] leading-relaxed text-black">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className={`prose-minimal ${className}`}>{elements}</div>;
};
