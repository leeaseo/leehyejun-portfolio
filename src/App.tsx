import { useState, useEffect } from 'react';
import { AboutResumeColumn } from './components/AboutResumeColumn';
import { WorkColumn } from './components/WorkColumn';
import { MoreColumn } from './components/MoreColumn';
import { AdminPublishModal } from './components/AdminPublishModal';
import {
  getAboutData,
  getResumeData,
  getAllProjects,
  getProjectBySlug,
} from './lib/content';
import { WorkProject, AboutData, ResumeData } from './lib/types';
import { Plus } from 'lucide-react';

type MobileTab = 'about' | 'work' | 'more';

export default function App() {
  const [aboutData, setAboutData] = useState<AboutData>(getAboutData);
  const [resumeData, setResumeData] = useState<ResumeData>(getResumeData);
  const [projectsList, setProjectsList] = useState<WorkProject[]>(getAllProjects);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Default to first project (Mobile Display System)
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>('mobile-display-system');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('work');

  // Read URL hash on load and handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!hash) {
        return;
      }

      if (hash.startsWith('more/')) {
        const slug = hash.replace('more/', '');
        const project = getProjectBySlug(slug);
        if (project) {
          setActiveProjectSlug(slug);
          setMobileTab('more');
        }
      } else if (hash === 'about' || hash === 'resume') {
        setMobileTab('about');
      } else if (hash === 'work') {
        setMobileTab('work');
      } else if (hash === 'admin') {
        setIsAdminOpen(true);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectProject = (slug: string) => {
    setActiveProjectSlug(slug);
    setMobileTab('more');
    window.location.hash = `#more/${slug}`;
  };

  const handleClearActiveProject = () => {
    setActiveProjectSlug(null);
    window.location.hash = '';
  };

  const handleProjectAdded = (newProject: WorkProject) => {
    const refreshed = getAllProjects();
    setProjectsList(refreshed);
    setActiveProjectSlug(newProject.slug);
    setMobileTab('more');
    window.location.hash = `#more/${newProject.slug}`;
  };

  const handleAboutUpdated = (newAbout: AboutData) => {
    setAboutData(newAbout);
  };

  const handleResumeUpdated = (newResume: ResumeData) => {
    setResumeData(newResume);
  };

  const activeProject = activeProjectSlug
    ? projectsList.find((p) => p && p.slug === activeProjectSlug) || getProjectBySlug(activeProjectSlug) || null
    : null;

  return (
    <div className="h-screen w-full bg-white text-black flex flex-col font-sans select-text overflow-hidden">
      {/* Mobile Top Navigation (only visible on mobile/tablet viewports) */}
      <div className="lg:hidden h-9 px-4 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white sticky top-0 z-30 shrink-0">
        <div className="text-[13px] font-normal text-black">Lee Hye Jun</div>
        <div className="flex items-center gap-1 text-[13px]">
          <button
            onClick={() => setMobileTab('about')}
            className={`px-2 py-0.5 cursor-pointer font-normal ${
              mobileTab === 'about' ? 'text-black underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)]'
            }`}
          >
            About
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => setMobileTab('work')}
            className={`px-2 py-0.5 cursor-pointer font-normal ${
              mobileTab === 'work' ? 'text-black underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)]'
            }`}
          >
            Work
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => setMobileTab('more')}
            className={`px-2 py-0.5 cursor-pointer font-normal ${
              mobileTab === 'more' ? 'text-black underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)]'
            }`}
          >
            More
          </button>
        </div>
      </div>

      {/* Main 3-Column Grid Container */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[rgba(0,0,0,0.15)]">
        {/* Column 1: About & Resume (Left - 3 cols) */}
        <section
          className={`h-full overflow-y-auto lg:col-span-3 ${
            mobileTab === 'about' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AboutResumeColumn aboutData={aboutData} resumeData={resumeData} />
        </section>

        {/* Column 2: Work (Middle - 5 cols) */}
        <section
          className={`h-full overflow-y-auto lg:col-span-5 ${
            mobileTab === 'work' ? 'block' : 'hidden lg:block'
          }`}
        >
          <WorkColumn
            projects={projectsList}
            activeSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </section>

        {/* Column 3: More (Right - 4 cols) */}
        <section
          className={`h-full overflow-y-auto lg:col-span-4 ${
            mobileTab === 'more' ? 'block' : 'hidden lg:block'
          }`}
        >
          <MoreColumn
            activeProject={activeProject}
            onClearActiveProject={handleClearActiveProject}
          />
        </section>
      </div>

      {/* Discreet Admin Publish Trigger in bottom-right corner */}
      <footer className="h-8 border-t border-[rgba(0,0,0,0.1)] px-4 flex items-center justify-between text-[11px] text-[rgba(0,0,0,0.4)] bg-white shrink-0 select-none">
        <div>
          © {new Date().getFullYear()} Lee Hye Jun. All rights reserved.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1 text-[11px] text-[rgba(0,0,0,0.5)] hover:text-black border border-[rgba(0,0,0,0.2)] hover:border-black px-2 py-0.5 transition-colors cursor-pointer"
          >
            <Plus size={10} />
            <span>Admin / + Add Work</span>
          </button>
        </div>
      </footer>

      {/* Admin Publish Modal */}
      {isAdminOpen && (
        <AdminPublishModal
          isOpen={isAdminOpen}
          onClose={() => {
            setIsAdminOpen(false);
            setProjectsList(getAllProjects());
            setAboutData(getAboutData());
            setResumeData(getResumeData());
          }}
          onProjectAdded={handleProjectAdded}
          onAboutUpdated={handleAboutUpdated}
          onResumeUpdated={handleResumeUpdated}
        />
      )}
    </div>
  );
}
