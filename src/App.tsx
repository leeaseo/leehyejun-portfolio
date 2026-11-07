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
  saveAllProjectsBatch,
  syncToServer,
  BUNDLED_VERSION,
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

  // Mobile tab state (default to 'about' so mobile users see Profile + Resume + Work list first)
  const [mobileTab, setMobileTab] = useState<MobileTab>('about');

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

  // Robust check for stale placeholder data
  const isStaleProjectData = (projs?: WorkProject[]): boolean => {
    if (!projs || !Array.isArray(projs) || projs.length === 0) return true;
    return projs.some(
      (p) =>
        p.title === 'Mobile Display System' ||
        p.title?.includes('Seating for Doing Nothing') ||
        p.title?.includes('05.fjkdljfklds') ||
        p.title?.includes('ㅂㅇㅇㅈㄷ')
    );
  };

  // Immediate purge of any stale browser cache on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('leehyejun_custom_projects');
        if (raw && isStaleProjectData(JSON.parse(raw))) {
          localStorage.removeItem('leehyejun_custom_projects');
          localStorage.removeItem('leehyejun_custom_experiences');
          localStorage.removeItem('leehyejun_has_local_admin_edits');
          const fresh = getAllProjects();
          const freshExp = getExperienceProjects();
          idbSet('leehyejun_custom_projects', fresh).catch(() => {});
          idbSet('leehyejun_custom_experiences', freshExp).catch(() => {});
          setProjectsList(fresh);
          setExperienceProjectsList(freshExp);
        }
      } catch {}
    }
  }, []);

  // Load and sync content: Compare Browser IndexedDB, Cloud Firestore, and /api/content by timestamp so the latest Admin edits always win
  useEffect(() => {
    async function loadAllContent() {
      let serverData: any = null;
      let firestoreData: any = null;
      let idbProjects: WorkProject[] | null = null;
      let idbExperiences: WorkProject[] | null = null;
      let idbMeta: { updatedAt?: string; bundledVersion?: string } | null = null;

      const [serverRes, idbProjRes, idbExpRes, idbMetaRes] = await Promise.allSettled([
        fetch('/api/content').then((r) => (r.ok ? r.json() : null)),
        idbGet<WorkProject[]>('leehyejun_custom_projects'),
        idbGet<WorkProject[]>('leehyejun_custom_experiences'),
        idbGet<{ updatedAt?: string; bundledVersion?: string }>('leehyejun_custom_meta'),
      ]);

      if (serverRes.status === 'fulfilled' && serverRes.value) {
        serverData = serverRes.value;
      }
      if (idbProjRes.status === 'fulfilled' && Array.isArray(idbProjRes.value)) {
        idbProjects = idbProjRes.value;
      }
      if (idbExpRes.status === 'fulfilled' && Array.isArray(idbExpRes.value)) {
        idbExperiences = idbExpRes.value;
      }
      if (idbMetaRes.status === 'fulfilled' && idbMetaRes.value) {
        idbMeta = idbMetaRes.value;
      }

      const isSameBundledVersion = idbMeta?.bundledVersion === BUNDLED_VERSION;
      const idbTime =
        isSameBundledVersion && idbMeta?.updatedAt ? new Date(idbMeta.updatedAt).getTime() : 0;

      const serverTime = serverData?.updatedAt
        ? new Date(serverData.updatedAt).getTime()
        : serverData?.exportedAt
        ? new Date(serverData.exportedAt).getTime()
        : 0;

      const hasValidIdb =
        isSameBundledVersion &&
        idbProjects &&
        idbProjects.length > 0 &&
        !isStaleProjectData(idbProjects);

      // 1. Only use Browser IndexedDB if it was created on the CURRENT custom-data.json version AND is strictly newer
      if (hasValidIdb && idbTime > serverTime) {
        const expList =
          idbExperiences && idbExperiences.length > 0 ? idbExperiences : getExperienceProjects();
        saveAllProjectsBatch(idbProjects!, expList, true);
        setProjectsList(idbProjects!);
        setExperienceProjectsList(expList);
        return;
      }

      const bundledTime = BUNDLED_VERSION !== 'v1' ? new Date(BUNDLED_VERSION).getTime() : 0;

      const hasValidServer =
        serverData &&
        Array.isArray(serverData.projects) &&
        serverData.projects.length > 0 &&
        !isStaleProjectData(serverData.projects) &&
        serverTime >= bundledTime;

      if (hasValidServer) {
        saveAllProjectsBatch(
          serverData.projects,
          Array.isArray(serverData.experiences) && serverData.experiences.length > 0
            ? serverData.experiences
            : getExperienceProjects(),
          true
        );
        setProjectsList(serverData.projects);

        if (Array.isArray(serverData.experiences) && serverData.experiences.length > 0) {
          setExperienceProjectsList(serverData.experiences);
        }
        if (serverData.about) setAboutData(serverData.about);
        if (serverData.resume) setResumeData(serverData.resume);
        return;
      }

      // 3. FALLBACK: Bundled custom-data.json
      try {
        const bundled = getAllProjects();
        const bundledExp = getExperienceProjects();
        if (bundled.length > 0) {
          setProjectsList(bundled);
        }
        if (bundledExp.length > 0) {
          setExperienceProjectsList(bundledExp);
        }
      } catch (err) {
        console.warn('[Cache] Sync error:', err);
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
      } else if (hash === 'work' || hash === 'photo') {
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
    const isExp = isExperienceSlug(slug);
    // Resume experience items open 'more' directly; Work items open 'work' (Photo) on mobile
    setMobileTab(isExp ? 'more' : 'work');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${isExp ? `more/${slug}` : 'photo'}`);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (workSectionRef.current) {
      workSectionRef.current.scrollTop = 0;
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
          className="text-[14px] font-medium text-black text-left cursor-pointer whitespace-nowrap shrink-0"
        >
          Lee Hye Jun
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => handleTabChange('about')}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors whitespace-nowrap shrink-0 ${
              mobileTab === 'about' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            About · Work
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => handleTabChange('work')}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors whitespace-nowrap shrink-0 ${
              mobileTab === 'work' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            Photo
          </button>
          <span className="text-[rgba(0,0,0,0.2)]">/</span>
          <button
            onClick={() => handleTabChange('more')}
            className={`px-2 py-1 cursor-pointer font-normal transition-colors whitespace-nowrap shrink-0 ${
              mobileTab === 'more' ? 'text-black font-medium underline underline-offset-4' : 'text-[rgba(0,0,0,0.4)] hover:text-black'
            }`}
          >
            More
          </button>
        </nav>
      </header>

      {/* Main 3-Column Grid Container (1:1:1 exact ratio on desktop) */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] min-h-0 lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[rgba(0,0,0,0.15)]">
        {/* Column 1: About & Resume & Work (Left - 1/3) */}
        <section
          ref={aboutSectionRef}
          className={`w-full min-w-0 min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto column-scroll ${
            mobileTab === 'about' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AboutResumeColumn
            aboutData={aboutData}
            resumeData={resumeData}
            projects={projectsList}
            activeProjectSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </section>

        {/* Column 2: Photo - Final Product Shoot Gallery (Middle - 1/3) */}
        <section
          ref={workSectionRef}
          className={`w-full min-w-0 min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto column-scroll ${
            mobileTab === 'work' ? 'block' : 'hidden lg:block'
          }`}
        >
          <WorkColumn
            projects={projectsList}
            activeProject={activeProject}
            activeSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
            onOpenMoreTab={() => handleTabChange('more')}
          />
        </section>

        {/* Column 3: More - Product Development Process & Specs (Right - 1/3) */}
        <section
          ref={moreSectionRef}
          className={`w-full min-w-0 min-h-[calc(100vh-80px)] lg:min-h-0 lg:h-full lg:overflow-y-auto column-scroll ${
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
