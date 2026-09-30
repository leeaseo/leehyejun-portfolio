import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Navigation } from './Navigation';
import { NavTab } from '../lib/types';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(0,0,0,0.15)] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Zone: 1 text element */}
        <button
          onClick={() => handleNavClick('about')}
          className="text-left font-bold text-lg tracking-tight text-black hover:opacity-80 transition-opacity cursor-pointer"
        >
          Lee Hye Jun
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center">
          <Navigation currentTab={currentTab} onSelectTab={handleNavClick} />
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-black hover:opacity-70 transition-opacity focus:outline-none"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(0,0,0,0.15)] bg-white px-6 py-4 animate-in slide-in-from-top duration-150">
          <Navigation
            currentTab={currentTab}
            onSelectTab={handleNavClick}
            isMobile={true}
          />
        </div>
      )}
    </header>
  );
};
