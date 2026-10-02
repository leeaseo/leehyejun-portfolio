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
import {
  subscribeToFirestoreProjects,
  subscribeToFirestoreAbout,
  subscribeToFirestoreResume,
} from './lib/firebase';
import { WorkProject, AboutData, ResumeData } from './lib/types';
import { Plus } from 'lucide-react';

type MobileTab = 'about' | 'work' | 'more';

export default function App() {
  const [aboutData, setAboutData] = useState<AboutData>(getAboutData());
  const [resumeData, setResumeData] = useState<ResumeData>(getResumeData());
  const [projectsList, setProjectsList] = useState<WorkProject[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Default to first project (Mobile Display System)
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>('mobile-display-system');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('work');

  // Load content initially
  useEffect(() => {
    setProjectsList(getAllProjects());
    setAboutData(getAboutData());
    setResumeData(getResumeData());
  }, []);

  // Realtime Cloud Sync via Firebase Firestore
  useEffect(() => {
    // 1. Projects subscription
    const unsubscribeProjects = subscribeToFirestoreProjects((cloudProjects) => {
      if (cloudProjects && cloudProjects.length > 0) {
        setProjectsList(cloudProjects);
      }
    });

    // 2. About subscription
    const unsubscribeAbout = subscribeToFirestoreAbout((cloudAbout) => {
      if (cloudAbout) {
        setAboutData(cloudAbout);
      }
    });

    // 3. Resume subscription
    const unsubscribeResume = subscribeToFirestoreResume((cloudResume) => {
      if (cloudResume) {
        setResumeData(cloudResume);
      }
    });

    return () => {
      unsubscribeProjects();
      unsubscribeAbout();
      unsubscribeResume();
    };
  }, []);

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
    ? projectsList.find((p) => p.slug === activeProjectSlug) || getProjectBySlug(activeProjectSlug) || null
    : null;

  return (
    <div className="h-screen w-full bg-white text-black flex flex-col font-sans select-text overflow-hidden">
      {/* Mobile Top Navigation (only visible on mobile/tablet viewports) */}
      <div className="lg:hidden h-9 px-4 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white sticky top-0 z-30 shrink-0">
        <div className="text-[13px] font-normal text-black">Lee Hye Jun</div>
        <div className="flex items-center gap-3 text-[13px] font-normal">
          <button
            onClick={() => setMobileTab('about')}
            className={`transition-colors ${
              mobileTab === 'about' ? 'text-black font-normal underline' : 'text-[rgba(0,0,0,0.5)]'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setMobileTab('work')}
            className={`transition-colors ${
              mobileTab === 'work' ? 'text-black font-normal underline' : 'text-[rgba(0,0,0,0.5)]'
            }`}
          >
            Work
          </button>
          <button
            onClick={() => setMobileTab('more')}
            className={`transition-colors ${
              mobileTab === 'more' ? 'text-black font-normal underline' : 'text-[rgba(0,0,0,0.5)]'
            }`}
          >
            More {activeProjectSlug && '●'}
          </button>
        </div>
      </div>

      {/* 3-Column Layout: 좌측 / 중앙 / 우측 넓이 동일하게 (1:1:1 = lg:w-1/3) */}
      <main className="flex-1 w-full h-[calc(100vh-2.25rem)] lg:h-screen flex flex-col lg:flex-row overflow-hidden">
        {/* ============================================================== */}
        {/* COLUMN 1 (LEFT): About / Resume (정확히 1/3 너비, 좌측 고정 독립스크롤) */}
        {/* ============================================================== */}
        <section
          className={`w-full lg:w-1/3 lg:h-full lg:overflow-y-auto custom-scrollbar lg:border-r border-[rgba(0,0,0,0.15)] shrink-0 flex flex-col justify-between ${
            mobileTab === 'about' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div>
            <AboutResumeColumn
              aboutData={aboutData}
              resumeData={resumeData}
            />
          </div>

          {/* Discreet Admin / Publish trigger for leehyejun */}
          <div className="p-4 border-t border-[rgba(0,0,0,0.08)] bg-white flex items-center justify-between text-[11px] text-[rgba(0,0,0,0.35)] shrink-0">
            <span>© Lee Hye Jun 2026</span>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-[11px] text-[rgba(0,0,0,0.4)] hover:text-black underline flex items-center gap-1 cursor-pointer font-normal"
              title="관리자 전용 패널 (leehyejun)"
            >
              <Plus size={10} />
              <span>Admin / + Add Work</span>
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* COLUMN 2 (MIDDLE): Work (정확히 1/3 너비, 단독 세로 스크롤 가능) */}
        {/* ============================================================== */}
        <section
          className={`w-full lg:w-1/3 lg:h-full lg:overflow-y-auto custom-scrollbar lg:border-r border-[rgba(0,0,0,0.15)] shrink-0 overscroll-contain ${
            mobileTab === 'work' ? 'block' : 'hidden lg:block'
          }`}
        >
          <WorkColumn
            projects={projectsList.length > 0 ? projectsList : getAllProjects()}
            activeSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </section>

        {/* ============================================================== */}
        {/* COLUMN 3 (RIGHT): More (정확히 1/3 너비, 단독 세로 스크롤 가능)  */}
        {/* ============================================================== */}
        <section
          className={`w-full lg:w-1/3 lg:h-full lg:overflow-y-auto custom-scrollbar shrink-0 overscroll-contain ${
            mobileTab === 'more' ? 'block' : 'hidden lg:block'
          }`}
        >
          <MoreColumn
            activeProject={activeProject}
            onClearActiveProject={handleClearActiveProject}
          />
        </section>
      </main>

      {/* Admin Publishing Modal for Site Owner */}
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
    </div>
  );
}
