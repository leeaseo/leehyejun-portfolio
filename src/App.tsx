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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('leehyejun_admin_auth') === 'true' ||
        sessionStorage.getItem('leehyejun_admin_auth') === 'true'
      );
    } catch {
      return false;
    }
  });

  // Default to first project (top of Work column, e.g. 01. 하)
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(() => {
    const all = getAllProjects();
    return all[0]?.slug || null;
  });

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('work');

  // Fetch latest shared content from server on mount (syncs PC, Mobile, and all devices)
  useEffect(() => {
    fetch('/api/content')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (Array.isArray(data.projects) && data.projects.length > 0) {
            setProjectsList(data.projects);
            const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
            if (!currentHash.includes('more/') && activeProjectSlug !== '__closed__') {
              setActiveProjectSlug(data.projects[0].slug);
            }
            try {
              localStorage.setItem('leehyejun_custom_projects', JSON.stringify(data.projects));
            } catch {}
          }
          if (data.about && typeof data.about === 'object') {
            setAboutData(data.about);
            try {
              localStorage.setItem('leehyejun_custom_about', JSON.stringify(data.about));
            } catch {}
          }
          if (data.resume && typeof data.resume === 'object') {
            setResumeData(data.resume);
            try {
              localStorage.setItem('leehyejun_custom_resume', JSON.stringify(data.resume));
            } catch {}
          }
        }
      })
      .catch((err) => console.warn('Could not sync with server:', err));
  }, []);

  // Cleanly clear hash without leaving trailing #
  const clearHash = () => {
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Read URL hash on load and handle hash changes
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#' || window.location.hash === '#/')) {
      clearHash();
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!hash) {
        clearHash();
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearActiveProject = () => {
    setActiveProjectSlug('__closed__');
    setMobileTab('work');
    clearHash();
  };

  const handleProjectAdded = (newProject: WorkProject) => {
    // Immediately update live project state in place, preserving order stability
    setProjectsList((prev) => {
      let replaced = false;
      const updated = prev.map((p) => {
        if (p.slug === newProject.slug || p.order === newProject.order) {
          replaced = true;
          return newProject;
        }
        return p;
      });
      if (!replaced) {
        updated.push(newProject);
      }
      return updated.sort((a, b) => (a.order || 99) - (b.order || 99));
    });
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

  const activeProject =
    activeProjectSlug === '__closed__'
      ? null
      : activeProjectSlug
      ? projectsList.find((p) => p && p.slug === activeProjectSlug) || getProjectBySlug(activeProjectSlug) || projectsList[0] || null
      : projectsList[0] || null;

  return (
    <div className="min-h-screen lg:h-screen w-full bg-white text-black flex flex-col font-sans select-text lg:overflow-hidden">
      {/* Mobile Top Navigation (only visible on mobile/tablet viewports) */}
      <header className="lg:hidden h-11 px-4 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white sticky top-0 z-30 shrink-0">
        <button
          onClick={() => {
            setMobileTab('about');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-[14px] font-medium text-black text-left cursor-pointer"
        >
          Lee Hye Jun
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => {
              setMobileTab('about');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors ${
              mobileTab === 'about' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            About
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => {
              setMobileTab('work');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors ${
              mobileTab === 'work' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            Work
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => {
              setMobileTab('more');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors ${
              mobileTab === 'more' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            More
          </button>
        </nav>
      </header>

      {/* Main 3-Column Grid Container (1:1:1 exact ratio on desktop) */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 min-h-0 lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[rgba(0,0,0,0.15)]">
        {/* Column 1: About & Resume (Left - 1/3) */}
        <section
          className={`w-full min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto ${
            mobileTab === 'about' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AboutResumeColumn aboutData={aboutData} resumeData={resumeData} />
        </section>

        {/* Column 2: Work (Middle - 1/3) */}
        <section
          className={`w-full min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto ${
            mobileTab === 'work' ? 'block' : 'hidden lg:block'
          }`}
        >
          <WorkColumn
            projects={projectsList}
            activeSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </section>

        {/* Column 3: More (Right - 1/3) */}
        <section
          className={`w-full min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto ${
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
            onClick={() => {
              setIsAdminOpen(true);
              window.location.hash = 'admin';
            }}
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
          isAuthenticated={isAdminAuthenticated}
          onAuthenticatedChange={setIsAdminAuthenticated}
          onClose={() => {
            setIsAdminOpen(false);
            if (window.location.hash) {
              clearHash();
            }
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
