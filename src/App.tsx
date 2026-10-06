import { useState, useEffect, useMemo, useRef } from 'react';
import { AboutResumeColumn } from './components/AboutResumeColumn';
import { WorkColumn } from './components/WorkColumn';
import { MoreColumn } from './components/MoreColumn';
import { AdminPublishModal } from './components/AdminPublishModal';
import {
  getAboutData,
  getResumeData,
  getAllProjects,
  getExperienceProjects,
  getProjectBySlug,
  isExperienceSlug,
  syncToServer,
} from './lib/content';
import { WorkProject, AboutData, ResumeData } from './lib/types';
import { idbGet, idbSet } from './lib/idbStorage';
import { fetchPortfolioFromFirestore, savePortfolioToFirestore } from './lib/firebase';
import { Plus } from 'lucide-react';

type MobileTab = 'about' | 'work' | 'more';

export default function App() {
  const [aboutData, setAboutData] = useState<AboutData>(getAboutData);
  const [resumeData, setResumeData] = useState<ResumeData>(getResumeData);
  const [projectsList, setProjectsList] = useState<WorkProject[]>(getAllProjects);
  const [experienceProjectsList, setExperienceProjectsList] = useState<WorkProject[]>(getExperienceProjects);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
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
  const [editingProjectForAdmin, setEditingProjectForAdmin] = useState<WorkProject | null>(null);

  // Default to first project (top of Work column, e.g. 01. 하)
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(() => {
    const all = getAllProjects();
    return all[0]?.slug || null;
  });

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('work');

  // Column Scroll Container Refs
  const aboutSectionRef = useRef<HTMLElement>(null);
  const workSectionRef = useRef<HTMLElement>(null);
  const moreSectionRef = useRef<HTMLElement>(null);

  const handleTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (tab === 'about' && aboutSectionRef.current) {
      aboutSectionRef.current.scrollTop = 0;
    } else if (tab === 'work' && workSectionRef.current) {
      workSectionRef.current.scrollTop = 0;
    } else if (tab === 'more' && moreSectionRef.current) {
      moreSectionRef.current.scrollTop = 0;
    }
  };

  // Ensure scroll is reset to top whenever mobile tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (mobileTab === 'about' && aboutSectionRef.current) {
      aboutSectionRef.current.scrollTop = 0;
    } else if (mobileTab === 'work' && workSectionRef.current) {
      workSectionRef.current.scrollTop = 0;
    } else if (mobileTab === 'more' && moreSectionRef.current) {
      moreSectionRef.current.scrollTop = 0;
    }
  }, [mobileTab]);

  // Load and sync content: 1) Server Content (Instant & Latest) -> 2) Cloud Firestore -> 3) Local Cache Fallback
  useEffect(() => {
    async function loadAllContent() {
      // 1. PRIMARY: Fetch latest verified server data (Instant, accurate, with all latest titles and images)
      try {
        const res = await fetch('/api/content');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (Array.isArray(data.projects) && data.projects.length > 0) {
              setProjectsList(data.projects);
              idbSet('leehyejun_custom_projects', data.projects).catch(() => {});
              try {
                localStorage.setItem('leehyejun_custom_projects', JSON.stringify(data.projects));
              } catch {}
            }
            if (Array.isArray(data.experiences) && data.experiences.length > 0) {
              setExperienceProjectsList(data.experiences);
              try {
                localStorage.setItem('leehyejun_custom_experiences', JSON.stringify(data.experiences));
              } catch {}
            }
            if (data.about) setAboutData(data.about);
            if (data.resume) setResumeData(data.resume);
            return;
          }
        }
      } catch (err) {
        console.warn('[Server] Could not sync with /api/content:', err);
      }

      // 2. SECONDARY: Fetch from Google Cloud Firestore (Realtime cloud database for all visitors)
      try {
        const firestoreData = await fetchPortfolioFromFirestore();
        if (
          firestoreData &&
          Array.isArray(firestoreData.projects) &&
          firestoreData.projects.length > 0
        ) {
          const fsProjects = firestoreData.projects;
          const workProjs = fsProjects.filter((p: any) => !isExperienceSlug(p?.slug) && (!p?.order || p.order < 100));
          const expProjs = fsProjects.filter((p: any) => isExperienceSlug(p?.slug) || (p?.order && p.order >= 100));

          if (workProjs.length > 0) {
            setProjectsList(workProjs);
            idbSet('leehyejun_custom_projects', workProjs).catch(() => {});
            try {
              localStorage.setItem('leehyejun_custom_projects', JSON.stringify(workProjs));
            } catch {}
          }
          if (expProjs.length > 0) {
            setExperienceProjectsList(expProjs);
            idbSet('leehyejun_custom_experiences', expProjs).catch(() => {});
            try {
              localStorage.setItem('leehyejun_custom_experiences', JSON.stringify(expProjs));
            } catch {}
          }
          if (firestoreData.about) setAboutData(firestoreData.about);
          if (firestoreData.resume) setResumeData(firestoreData.resume);
          return;
        }
      } catch (err) {
        console.warn('[Firestore] Client fetch:', err);
      }

      // 3. FALLBACK: IndexedDB & LocalStorage cache
      try {
        const idbProjects = await idbGet<WorkProject[]>('leehyejun_custom_projects');
        if (Array.isArray(idbProjects) && idbProjects.length > 0) {
          setProjectsList(idbProjects);
        }
        const idbExp = await idbGet<WorkProject[]>('leehyejun_custom_experiences');
        if (Array.isArray(idbExp) && idbExp.length > 0) {
          setExperienceProjectsList(idbExp);
        }
      } catch (err) {
        console.warn('[Auto-Recovery] IDB check:', err);
      }
    }

    loadAllContent();
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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (moreSectionRef.current) {
      moreSectionRef.current.scrollTop = 0;
    }
  };

  const handleClearActiveProject = () => {
    setActiveProjectSlug('__closed__');
    setMobileTab('work');
    clearHash();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (workSectionRef.current) {
      workSectionRef.current.scrollTop = 0;
    }
  };

  const handleProjectAdded = (newProject: WorkProject) => {
    const isExp =
      isExperienceSlug(newProject.slug) ||
      (typeof newProject.order === 'number' && newProject.order >= 100);

    if (isExp) {
      setExperienceProjectsList((prev) => {
        let replaced = false;
        const updated = prev.map((p) => {
          if (p.slug === newProject.slug) {
            replaced = true;
            return newProject;
          }
          return p;
        });
        if (!replaced) {
          updated.push(newProject);
        }
        return updated;
      });
    } else {
      setProjectsList((prev) => {
        let replaced = false;
        const updated = prev.map((p) => {
          if (p.slug === newProject.slug) {
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
    }

    setActiveProjectSlug(newProject.slug);
    setMobileTab('more');
    window.location.hash = `#more/${newProject.slug}`;
  };

  const handleBatchUpdated = (projects: WorkProject[], experiences: WorkProject[]) => {
    setProjectsList(projects);
    setExperienceProjectsList(experiences);
  };

  const handleAboutUpdated = (newAbout: AboutData) => {
    setAboutData(newAbout);
  };

  const handleResumeUpdated = (newResume: ResumeData) => {
    setResumeData(newResume);
  };

  const activeProject = useMemo(() => {
    if (activeProjectSlug === '__closed__') return null;
    if (activeProjectSlug) {
      return (
        projectsList.find((p) => p && p.slug === activeProjectSlug) ||
        experienceProjectsList.find((p) => p && p.slug === activeProjectSlug) ||
        getProjectBySlug(activeProjectSlug) ||
        projectsList[0] ||
        null
      );
    }
    return projectsList[0] || null;
  }, [activeProjectSlug, projectsList, experienceProjectsList]);

  return (
    <div className="min-h-screen lg:h-screen w-full bg-white text-black flex flex-col font-sans select-text lg:overflow-hidden">
      {/* Auto-Recovery Success Notification Banner */}
      {recoveryNotice && (
        <div className="bg-neutral-900 text-white text-[12px] py-2 px-4 flex items-center justify-between shrink-0 z-50 shadow-md">
          <span>{recoveryNotice}</span>
          <button
            type="button"
            onClick={() => setRecoveryNotice(null)}
            className="text-neutral-300 hover:text-white text-[11px] underline ml-4 cursor-pointer"
          >
            확인 (닫기)
          </button>
        </div>
      )}

      {/* Mobile Top Navigation (only visible on mobile/tablet viewports) */}
      <header className="lg:hidden h-11 px-4 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white sticky top-0 z-30 shrink-0">
        <button
          onClick={() => handleTabChange('about')}
          className="text-[14px] font-medium text-black text-left cursor-pointer"
        >
          Lee Hye Jun
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => handleTabChange('about')}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors ${
              mobileTab === 'about' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            About
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => handleTabChange('work')}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors ${
              mobileTab === 'work' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            Work
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => handleTabChange('more')}
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
          ref={aboutSectionRef}
          className={`w-full min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto ${
            mobileTab === 'about' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AboutResumeColumn
            aboutData={aboutData}
            resumeData={resumeData}
            activeProjectSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </section>

        {/* Column 2: Work (Middle - 1/3) */}
        <section
          ref={workSectionRef}
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
          ref={moreSectionRef}
          className={`w-full min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto ${
            mobileTab === 'more' ? 'block' : 'hidden lg:block'
          }`}
        >
          <MoreColumn
            activeProject={activeProject}
            onClearActiveProject={handleClearActiveProject}
            onProjectUpdated={(updated) => {
              if (isExperienceSlug(updated?.slug) || (updated?.order && updated?.order >= 100)) {
                setExperienceProjectsList(getExperienceProjects());
              } else {
                setProjectsList(getAllProjects());
              }
            }}
            onEditProject={(proj) => {
              setEditingProjectForAdmin(proj);
              setIsAdminOpen(true);
            }}
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
              setEditingProjectForAdmin(null);
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
          initialEditingProject={editingProjectForAdmin}
          onClose={() => {
            setIsAdminOpen(false);
            setEditingProjectForAdmin(null);
            if (window.location.hash) {
              clearHash();
            }
            setProjectsList(getAllProjects());
            setExperienceProjectsList(getExperienceProjects());
            setAboutData(getAboutData());
            setResumeData(getResumeData());
          }}
          onProjectAdded={handleProjectAdded}
          onBatchUpdated={handleBatchUpdated}
          onAboutUpdated={handleAboutUpdated}
          onResumeUpdated={handleResumeUpdated}
        />
      )}
    </div>
  );
}
