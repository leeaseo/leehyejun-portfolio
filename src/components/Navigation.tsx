import React from 'react';
import { NavTab } from '../lib/types';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  className?: string;
  isMobile?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  className = '',
  isMobile = false,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'resume', label: 'Resume' },
    { id: 'work', label: 'Work' },
    { id: 'more', label: 'More' },
  ];

  if (isMobile) {
    return (
      <nav className={`flex flex-col gap-4 py-4 ${className}`}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`text-left text-lg tracking-tight transition-colors py-1 ${
                isActive
                  ? 'font-medium text-black border-b border-black w-fit'
                  : 'text-[rgba(0,0,0,0.6)] hover:text-black font-normal'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={`flex items-center gap-3 sm:gap-4 text-[14px] sm:text-[15px] ${className}`}>
      {navItems.map((item, index) => {
        const isActive = currentTab === item.id;
        return (
          <React.Fragment key={item.id}>
            <button
              onClick={() => onSelectTab(item.id)}
              className={`cursor-pointer transition-colors relative py-0.5 ${
                isActive
                  ? 'text-black font-semibold underline underline-offset-4 decoration-black'
                  : 'text-[rgba(0,0,0,0.6)] hover:text-black font-normal hover:underline hover:underline-offset-4 hover:decoration-[rgba(0,0,0,0.3)]'
              }`}
            >
              {item.label}
            </button>
            {index < navItems.length - 1 && (
              <span className="text-[rgba(0,0,0,0.25)] select-none font-light" aria-hidden="true">
                |
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
