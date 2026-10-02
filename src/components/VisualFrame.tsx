import React from 'react';

interface VisualFrameProps {
  src?: string;
  alt: string;
  type?: 'profile' | 'product' | 'hardware';
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | 'auto';
  subtitle?: string;
  className?: string;
}

export const VisualFrame: React.FC<VisualFrameProps> = ({
  src,
  alt,
  type = 'product',
  aspectRatio = '3:4',
  subtitle,
  className = '',
}) => {
  const aspectClass =
    aspectRatio === '1:1'
      ? 'aspect-square'
      : aspectRatio === '16:9'
      ? 'aspect-[16/9]'
      : aspectRatio === '4:3'
      ? 'aspect-[4/3]'
      : aspectRatio === '3:4'
      ? 'aspect-[3/4]'
      : 'aspect-auto';

  // Render authentic architectural / industrial product graphics
  const renderArchitecturalFallback = () => {
    if (type === 'profile') {
      return (
        <div className="w-full h-full bg-[#F7F7F6] flex flex-col items-center justify-center p-8 relative overflow-hidden border border-[rgba(0,0,0,0.08)]">
          <div className="w-24 h-24 rounded-full border border-[rgba(0,0,0,0.15)] bg-[#EFEFEF] flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[rgba(0,0,0,0.3)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="mt-3 text-center">
            <div className="text-[13px] font-medium text-black">Lee Hye Jun</div>
            <div className="text-[11px] text-[rgba(0,0,0,0.5)] font-mono">Seoul, KR</div>
          </div>
        </div>
      );
    }

    const lowerAlt = (alt + ' ' + (subtitle || '')).toLowerCase();

    // 1. Mobile Display System (Tall aluminum frame with hung garments & cantilever shelves as in video)
    if (lowerAlt.includes('display') || lowerAlt.includes('rack') || lowerAlt.includes('shelving')) {
      return (
        <div className="w-full h-full bg-[#F5F5F3] flex flex-col items-center justify-center p-6 relative overflow-hidden group-hover:bg-[#F2F2F0] transition-colors">
          <svg className="w-4/5 h-4/5 max-h-[460px] text-[#222]" viewBox="0 0 260 340" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* Main Outer Aluminum Framework */}
            <rect x="40" y="30" width="180" height="270" stroke="currentColor" strokeWidth="2.5" />
            {/* Center vertical upright divider */}
            <line x1="140" y1="30" x2="140" y2="300" stroke="currentColor" strokeWidth="2" />
            
            {/* Left side: Cantilever shelving tiers */}
            <line x1="20" y1="90" x2="140" y2="90" stroke="currentColor" strokeWidth="1.8" />
            <line x1="20" y1="140" x2="140" y2="140" stroke="currentColor" strokeWidth="1.8" />
            <line x1="20" y1="190" x2="140" y2="190" stroke="currentColor" strokeWidth="1.8" />
            <line x1="20" y1="240" x2="140" y2="240" stroke="currentColor" strokeWidth="1.8" />
            {/* Left shelf depth perspective lines */}
            <line x1="20" y1="90" x2="35" y2="75" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="140" y1="90" x2="155" y2="75" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />

            {/* Right side: Clothing rail & hanging shirts */}
            <line x1="140" y1="65" x2="220" y2="65" stroke="currentColor" strokeWidth="2.2" />
            
            {/* Shirt 1 hanger & body */}
            <path d="M165 65 L155 75 L175 75 Z" fill="rgba(0,0,0,0.1)" stroke="currentColor" strokeWidth="1" />
            <path d="M152 75 L145 95 L155 100 L158 175 L172 175 L175 100 L185 95 L178 75 Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
            <line x1="165" y1="75" x2="165" y2="175" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />

            {/* Shirt 2 hanger & body */}
            <path d="M195 65 L185 75 L205 75 Z" fill="rgba(0,0,0,0.1)" stroke="currentColor" strokeWidth="1" />
            <path d="M182 75 L175 95 L185 100 L188 175 L202 175 L205 100 L215 95 L208 75 Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
            <line x1="195" y1="75" x2="195" y2="175" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />

            {/* Bottom Caster / Footing Details */}
            <circle cx="40" cy="305" r="5" fill="#555" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="140" cy="305" r="5" fill="#555" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="220" cy="305" r="5" fill="#555" stroke="currentColor" strokeWidth="1.5" />
            {/* Diagonal stability brace */}
            <line x1="40" y1="280" x2="70" y2="300" stroke="currentColor" strokeWidth="1.2" />
            <line x1="140" y1="280" x2="170" y2="300" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
      );
    }

    // 2. Seating for Doing Nothing at All (Minimal tubular lounge structure)
    if (lowerAlt.includes('seating') || lowerAlt.includes('chair')) {
      return (
        <div className="w-full h-full bg-[#F5F5F3] flex flex-col items-center justify-center p-6 relative overflow-hidden group-hover:bg-[#F2F2F0] transition-colors">
          <svg className="w-4/5 h-4/5 max-h-[380px] text-[#222]" viewBox="0 0 280 220" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* Two connected lounge chairs */}
            <path d="M30 160 L60 160 L90 80 L140 90 L160 160" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M140 160 L170 160 L200 80 L250 90 L270 160" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            
            {/* Polyurethane cushions */}
            <rect x="75" y="70" width="70" height="40" rx="8" fill="#FFF" stroke="currentColor" strokeWidth="1.5" />
            <rect x="75" y="115" width="70" height="35" rx="6" fill="#FFF" stroke="currentColor" strokeWidth="1.5" />
            
            <rect x="185" y="70" width="70" height="40" rx="8" fill="#FFF" stroke="currentColor" strokeWidth="1.5" />
            <rect x="185" y="115" width="70" height="35" rx="6" fill="#FFF" stroke="currentColor" strokeWidth="1.5" />

            {/* Paracord webbing / springs */}
            <line x1="75" y1="110" x2="145" y2="110" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="185" y1="110" x2="255" y2="110" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />

            {/* Tubular legs & crossbars */}
            <line x1="50" y1="160" x2="50" y2="185" stroke="currentColor" strokeWidth="2" />
            <line x1="150" y1="160" x2="150" y2="185" stroke="currentColor" strokeWidth="2" />
            <line x1="260" y1="160" x2="260" y2="185" stroke="currentColor" strokeWidth="2" />
            <line x1="40" y1="185" x2="270" y2="185" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        </div>
      );
    }

    // 3. Modular Adapter System (Dual USB-C ports on machined aluminum block as in user screenshot)
    if (lowerAlt.includes('adapter') || lowerAlt.includes('modular')) {
      return (
        <div className="w-full h-full bg-[#F5F5F3] flex flex-col items-center justify-center p-6 relative overflow-hidden group-hover:bg-[#F2F2F0] transition-colors">
          <div className="relative w-32 sm:w-36 h-72 sm:h-80 bg-gradient-to-b from-[#E6E6E6] via-[#DCDCDC] to-[#D5D5D5] border border-[rgba(0,0,0,0.18)] shadow-xs flex flex-col items-center justify-between py-5">
            {/* Top alignment magnets */}
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#C8C8C8] border border-[rgba(0,0,0,0.2)]" />
              <div className="w-4 h-4 rounded-full bg-[#C8C8C8] border border-[rgba(0,0,0,0.2)]" />
            </div>

            {/* Upper vertical USB-C receptacle */}
            <div className="w-4 h-14 rounded-full bg-[#181818] border border-[#444] flex items-center justify-center relative">
              <div className="w-1.5 h-9 bg-[#383838] rounded-xs" />
            </div>

            {/* Modular block split seam line */}
            <div className="w-full h-[1px] bg-[rgba(0,0,0,0.22)]" />

            {/* Lower vertical USB-C receptacle */}
            <div className="w-4 h-14 rounded-full bg-[#181818] border border-[#444] flex items-center justify-center relative mb-3">
              <div className="w-1.5 h-9 bg-[#383838] rounded-xs" />
            </div>
          </div>
        </div>
      );
    }

    // Default: Clean Minimal Product Plate
    return (
      <div className="w-full h-full bg-[#F5F5F3] flex flex-col items-center justify-center p-6 relative overflow-hidden group-hover:bg-[#F2F2F0] transition-colors">
        <svg className="w-3/5 h-3/5 max-h-48 text-[#333]" viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="30" y="25" width="140" height="70" rx="2" stroke="currentColor" />
          <circle cx="100" cy="60" r="16" stroke="currentColor" />
          <circle cx="100" cy="60" r="6" stroke="currentColor" fill="rgba(0,0,0,0.05)" />
          <line x1="30" y1="60" x2="170" y2="60" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1="100" y1="25" x2="100" y2="95" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
        </svg>
      </div>
    );
  };

  return (
    <div className={`relative w-full overflow-hidden bg-[#F5F5F3] ${aspectClass} ${className}`}>
      {renderArchitecturalFallback()}
      {src ? (
        <img
          src={src}
          alt={alt}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  );
};
