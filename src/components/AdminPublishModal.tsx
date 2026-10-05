import React, { useState, useRef, useEffect } from 'react';
import { WorkProject, AboutData, ResumeData, ResumeExperience, ResumeHonor } from '../lib/types';
import {
  saveCustomProject,
  getAllProjects,
  deleteCustomProject,
  getAboutData,
  saveAboutData,
  getResumeData,
  saveResumeData,
  syncToServer,
  getExperienceProjects,
  saveExperienceProject,
  saveAllProjectsBatch,
  isExperienceSlug,
} from '../lib/content';
import { getHonorSlug } from '../lib/experienceData';
import { savePortfolioToFirestore, deleteProjectFromFirestore } from '../lib/firebase';
import { compressImageFile } from '../lib/imageCompressor';
import {
  X,
  Plus,
  Download,
  Check,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Upload,
  User,
  FileText,
  Briefcase,
  Loader2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdminPublishModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onProjectAdded: (newProject: WorkProject) => void;
  onAboutUpdated: (newAbout: AboutData) => void;
  onResumeUpdated: (newResume: ResumeData) => void;
  onBatchUpdated?: (projects: WorkProject[], experiences: WorkProject[]) => void;
  isAuthenticated?: boolean;
  onAuthenticatedChange?: (authed: boolean) => void;
  initialEditingProject?: WorkProject | null;
}

export const AdminPublishModal: React.FC<AdminPublishModalProps> = ({
  onClose,
  onProjectAdded,
  onAboutUpdated,
  onResumeUpdated,
  onBatchUpdated,
  isAuthenticated: propIsAuthenticated,
  onAuthenticatedChange,
  initialEditingProject,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (propIsAuthenticated !== undefined) return propIsAuthenticated;
    try {
      return (
        localStorage.getItem('leehyejun_admin_auth') === 'true' ||
        sessionStorage.getItem('leehyejun_admin_auth') === 'true'
      );
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    if (propIsAuthenticated !== undefined) {
      setIsAuthenticated(propIsAuthenticated);
    }
  }, [propIsAuthenticated]);

  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Main Section Tabs: 'work' | 'about' | 'resume'
  const [mainSection, setMainSection] = useState<'work' | 'about' | 'resume'>('work');

  // Work Sub-tab: 'editor' | 'list'
  const [workTab, setWorkTab] = useState<'editor' | 'list'>('editor');
  const [projectsList, setProjectsList] = useState<WorkProject[]>(getAllProjects);
  const [draftProjects, setDraftProjects] = useState<WorkProject[]>(getAllProjects);
  const [draftExperiences, setDraftExperiences] = useState<WorkProject[]>(getExperienceProjects);
  const [modifiedSlugs, setModifiedSlugs] = useState<Set<string>>(new Set());
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  // Work Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('2026');
  const [materials, setMaterials] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [externalUrl, setExternalUrl] = useState('');
  const [content, setContent] = useState('');

  // Work 대표사진 & More 세부사진
  const [thumbnail, setThumbnail] = useState<string>('');
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [newDetailUrl, setNewDetailUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // About Form states
  const [aboutForm, setAboutForm] = useState<AboutData>(getAboutData);

  // Resume Form states
  const [resumeForm, setResumeForm] = useState<ResumeData>(getResumeData);

  const [isSaved, setIsSaved] = useState(false);

  const loadProjectIntoForm = (proj: WorkProject) => {
    setEditingSlug(proj.slug);
    setTitle(proj.title || '');
    setSlug(proj.slug);
    setDate(proj.date || '2026');
    setMaterials(proj.materials || '');
    setDimensions(proj.dimensions || '');
    setOrder(typeof proj.order === 'number' ? proj.order : 1);
    setExternalUrl(proj.externalUrl || '');
    setContent(proj.content || '');
    setThumbnail(proj.thumbnail || '');
    const cleanImages = (proj.images || []).filter(
      (img) => img && !img.includes('display-system-1.jpg') && !img.includes('display-system-2.jpg')
    );
    setDetailImages(cleanImages);
    setWorkTab('editor');
  };

  // Auto-select first project (#1) or specified project on open
  React.useEffect(() => {
    if (isAuthenticated) {
      const pList = getAllProjects();
      const expList = getExperienceProjects();
      setDraftProjects(pList);
      setDraftExperiences(expList);
      setProjectsList(pList);

      if (initialEditingProject) {
        setMainSection('work');
        setWorkTab('editor');
        const isExp =
          (typeof initialEditingProject.order === 'number' && initialEditingProject.order >= 100) ||
          isExperienceSlug(initialEditingProject.slug);
        const target = isExp
          ? expList.find((e) => e.slug === initialEditingProject.slug) || initialEditingProject
          : pList.find((p) => p.slug === initialEditingProject.slug) || initialEditingProject;
        loadProjectIntoForm(target);
      } else if (!editingSlug && pList.length > 0) {
        loadProjectIntoForm(pList[0]);
      }
    }
  }, [isAuthenticated, initialEditingProject]);

  const commitCurrentProjectToDraft = (currentSlug: string | null) => {
    const activeTitle = title.trim();
    if (!currentSlug && !activeTitle && !thumbnail && detailImages.length === 0) return;

    const targetSlug =
      currentSlug ||
      slug.trim() ||
      activeTitle.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').trim().replace(/\s+/g, '-') ||
      `project-${Date.now()}`;

    const currentData: WorkProject = {
      title: activeTitle || 'Untitled',
      slug: targetSlug,
      date: date || '2026',
      thumbnail: thumbnail || '',
      images: detailImages,
      materials: materials || 'Aluminum Extrusions, Hardware',
      dimensions: dimensions || 'Various Dimensions',
      externalUrl: externalUrl || undefined,
      order: Number(order) || (draftProjects.length + 1),
      content: content || '프로젝트 상세 내용입니다.',
    };

    const isExp =
      Number(order) >= 100 ||
      isExperienceSlug(targetSlug) ||
      draftExperiences.some((e) => e.slug === targetSlug);

    if (isExp) {
      let found = false;
      setDraftExperiences((prev) => {
        const updated = prev.map((e) => {
          if (e.slug === targetSlug) {
            found = true;
            return { ...e, ...currentData };
          }
          return e;
        });
        if (!found) updated.push(currentData);
        return updated;
      });
    } else {
      let found = false;
      setDraftProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.slug === targetSlug) {
            found = true;
            return { ...p, ...currentData };
          }
          return p;
        });
        if (!found) updated.push(currentData);
        return updated.sort((a, b) => (a.order || 99) - (b.order || 99));
      });
    }
    setModifiedSlugs((prev) => new Set(prev).add(targetSlug));
  };

  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = () => {
    const data = {
      about: getAboutData(),
      resume: getResumeData(),
      projects: getAllProjects(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leehyejun-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);

          // 1. Send to server first so that base64 images are automatically extracted to static .jpg files
          let activeData = parsed;
          try {
            const res = await fetch('/api/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed),
            });
            const result = await res.json();
            if (result && result.data) {
              activeData = result.data;
            }
          } catch (syncErr) {
            console.warn('Server sync error during import:', syncErr);
          }

          if (activeData.about) {
            saveAboutData(activeData.about);
            onAboutUpdated(activeData.about);
            setAboutForm(activeData.about);
          }
          if (activeData.resume) {
            saveResumeData(activeData.resume);
            onResumeUpdated(activeData.resume);
            setResumeForm(activeData.resume);
          }
          if (activeData.projects && Array.isArray(activeData.projects)) {
            activeData.projects.forEach((proj: WorkProject) => saveCustomProject(proj));
            const all = getAllProjects();
            setProjectsList(all);
            setDraftProjects(all);
            if (all[0]) {
              onProjectAdded(all[0]);
            }
          }
          if (activeData.experiences && Array.isArray(activeData.experiences)) {
            setDraftExperiences(activeData.experiences);
          }

          alert('데이터를 성공적으로 불러왔습니다! 고화질 사진들이 실제 이미지 파일로 최적화되어 클라우드(Firestore)에 안전하게 영구 동기화되었습니다.');
        } catch {
          alert('올바르지 않은 백업 파일 형식입니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'leeaseo8626') {
      setIsAuthenticated(true);
      onAuthenticatedChange?.(true);
      try {
        localStorage.setItem('leehyejun_admin_auth', 'true');
        sessionStorage.setItem('leehyejun_admin_auth', 'true');
      } catch (err) {
        console.warn(err);
      }
      setErrorMsg('');
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    onAuthenticatedChange?.(false);
    try {
      localStorage.removeItem('leehyejun_admin_auth');
      sessionStorage.removeItem('leehyejun_admin_auth');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingSlug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9가-힣\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
      );
    }
  };

  // Work 대표사진 파일 업로드 (자동 압축 처리)
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressedBase64 = await compressImageFile(file, 1920, 0.85);
        setThumbnail(compressedBase64);
      } catch (err) {
        console.error('Failed to compress thumbnail:', err);
        alert('이미지 처리 중 오류가 발생했습니다.');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  // More 세부사진 파일 업로드 (자동 압축 처리)
  const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        setIsCompressing(true);
        const compressedList: string[] = [];
        for (const file of Array.from(files)) {
          const compressed = await compressImageFile(file, 1920, 0.85);
          compressedList.push(compressed);
        }
        setDetailImages((prev) => [...prev, ...compressedList]);
      } catch (err) {
        console.error('Failed to compress detail images:', err);
        alert('이미지 처리 중 오류가 발생했습니다.');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleAddDetailUrl = () => {
    if (newDetailUrl.trim()) {
      setDetailImages((prev) => [...prev, newDetailUrl.trim()]);
      setNewDetailUrl('');
    }
  };

  const handleRemoveDetailImage = (indexToRemove: number) => {
    setDetailImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Drag and drop states for detail images reordering
  const [draggedDetailIdx, setDraggedDetailIdx] = useState<number | null>(null);
  const [dragOverDetailIdx, setDragOverDetailIdx] = useState<number | null>(null);

  const handleDragStartDetail = (e: React.DragEvent, index: number) => {
    setDraggedDetailIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragEnterDetail = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedDetailIdx === null || draggedDetailIdx === index) return;
    setDragOverDetailIdx(index);
  };

  const handleDragOverDetail = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropDetail = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDetailIdx === null || draggedDetailIdx === targetIndex) {
      setDraggedDetailIdx(null);
      setDragOverDetailIdx(null);
      return;
    }

    setDetailImages((prev) => {
      const copy = [...prev];
      const [movedItem] = copy.splice(draggedDetailIdx, 1);
      copy.splice(targetIndex, 0, movedItem);
      return copy;
    });

    setDraggedDetailIdx(null);
    setDragOverDetailIdx(null);
  };

  const handleDragEndDetail = () => {
    setDraggedDetailIdx(null);
    setDragOverDetailIdx(null);
  };

  const handleMoveDetailStep = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= detailImages.length) return;
    setDetailImages((prev) => {
      const copy = [...prev];
      const [movedItem] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, movedItem);
      return copy;
    });
  };

  const handleSelectProjectToEdit = (proj: WorkProject) => {
    // 1. Commit previous project before switching
    if (editingSlug) {
      commitCurrentProjectToDraft(editingSlug);
    }

    // 2. Find target project in drafts
    const isTargetExp =
      (typeof proj.order === 'number' && proj.order >= 100) ||
      isExperienceSlug(proj.slug) ||
      draftExperiences.some((e) => e.slug === proj.slug);

    const target = isTargetExp
      ? draftExperiences.find((e) => e.slug === proj.slug) || proj
      : draftProjects.find((p) => p.slug === proj.slug) || proj;

    loadProjectIntoForm(target);
  };

  const handleNewProject = () => {
    commitCurrentProjectToDraft(editingSlug);
    setEditingSlug(null);
    setTitle('');
    setSlug('');
    setDate(new Date().getFullYear().toString());
    setMaterials('');
    setDimensions('');
    const maxOrder = draftProjects.reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
    setOrder(maxOrder + 1);
    setExternalUrl('');
    setContent('');
    setThumbnail('');
    setDetailImages([]);
    setWorkTab('editor');
  };

  const handleDeleteProject = (slugToDelete: string) => {
    if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
      deleteCustomProject(slugToDelete);
      deleteProjectFromFirestore(slugToDelete).catch(() => {});
      const updated = getAllProjects();
      setDraftProjects(updated);
      setProjectsList(updated);
      if (editingSlug === slugToDelete) {
        handleNewProject();
      }
    }
  };

  const handleSwitchSection = (section: 'work' | 'about' | 'resume') => {
    if (mainSection === 'work' && editingSlug) {
      commitCurrentProjectToDraft(editingSlug);
    }
    setMainSection(section);
  };

  const generateMdxText = (): string => {
    const imagesYaml =
      detailImages.length > 0
        ? `images:\n${detailImages.map((img) => `  - "${img.startsWith('data:') ? 'uploaded-image' : img}"`).join('\n')}`
        : `images: []`;

    return `---
title: "${title}"
slug: "${slug || 'project'}"
date: "${date}"
thumbnail: "${thumbnail.startsWith('data:') ? '/images/work/thumbnail.jpg' : thumbnail}"
${imagesYaml}
materials: "${materials}"
dimensions: "${dimensions}"
externalUrl: "${externalUrl || ''}"
order: ${order}
---

${content || '## 개요\n프로젝트 설명 내용을 작성하세요.'}
`;
  };

  const handleDownloadMdx = () => {
    const text = generateMdxText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug || 'new-project'}.mdx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePublishWork = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Commit active project into draft arrays
    let finalProjects = [...draftProjects];
    let finalExperiences = [...draftExperiences];

    const activeTitle = title.trim();
    const activeSlug = (
      editingSlug ||
      slug.trim() ||
      activeTitle.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').trim().replace(/\s+/g, '-')
    ).trim();

    let publishedProject: WorkProject | null = null;

    if (activeSlug || activeTitle || thumbnail || detailImages.length > 0) {
      const targetSlug = activeSlug || `project-${Date.now()}`;
      const currentProjectData: WorkProject = {
        title: activeTitle || 'Untitled',
        slug: targetSlug,
        date: date || '2026',
        thumbnail: thumbnail || '',
        images: detailImages,
        materials: materials || 'Aluminum Extrusions, Hardware',
        dimensions: dimensions || 'Various Dimensions',
        externalUrl: externalUrl || undefined,
        order: Number(order) || (finalProjects.length + 1),
        content: content || '프로젝트 상세 내용입니다.',
      };
      publishedProject = currentProjectData;

      const isExp =
        Number(order) >= 100 ||
        isExperienceSlug(targetSlug) ||
        finalExperiences.some((e) => e.slug === targetSlug);

      if (isExp) {
        let found = false;
        finalExperiences = finalExperiences.map((e) => {
          if (e.slug === targetSlug) {
            found = true;
            return { ...e, ...currentProjectData };
          }
          return e;
        });
        if (!found) {
          finalExperiences.push(currentProjectData);
        }
      } else {
        let found = false;
        finalProjects = finalProjects.map((p) => {
          if (p.slug === targetSlug) {
            found = true;
            return { ...p, ...currentProjectData };
          }
          return p;
        });
        if (!found) {
          finalProjects.push(currentProjectData);
        }
        finalProjects.sort((a, b) => (a.order || 99) - (b.order || 99));
      }

      setEditingSlug(targetSlug);
    }

    // 2. Save all projects and experiences in storage & cache
    for (const p of finalProjects) {
      saveCustomProject(p, p.slug);
    }
    for (const exp of finalExperiences) {
      saveExperienceProject(exp);
    }

    // 3. Also save About & Resume
    saveAboutData(aboutForm);
    saveResumeData(resumeForm);

    saveAllProjectsBatch(finalProjects, finalExperiences);

    setDraftProjects(finalProjects);
    setDraftExperiences(finalExperiences);
    setProjectsList(finalProjects);

    onBatchUpdated?.(finalProjects, finalExperiences);
    onAboutUpdated(aboutForm);
    onResumeUpdated(resumeForm);
    if (publishedProject) {
      onProjectAdded(publishedProject);
    }

    setIsSaved(true);

    // Sync to local server file & Firestore immediately
    syncToServer({
      projects: finalProjects,
      experiences: finalExperiences,
      about: aboutForm,
      resume: resumeForm,
    });

    savePortfolioToFirestore({
      projects: finalProjects,
      experiences: finalExperiences,
      about: aboutForm,
      resume: resumeForm,
    }).catch((err) => console.error('[Firestore] Save error:', err));

    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  // About Form Save Handler
  const handleSaveAbout = (e: React.FormEvent) => {
    handlePublishWork(e);
  };

  // Resume Form Save Handler
  const handleSaveResume = (e: React.FormEvent) => {
    handlePublishWork(e);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col border border-black shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="min-h-11 px-3 sm:px-5 py-2 sm:py-0 border-b border-[rgba(0,0,0,0.15)] flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-normal text-black">
            {isAuthenticated ? <Unlock size={14} /> : <Lock size={14} />}
            <span className="truncate">Admin Center (leehyejun)</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {isAuthenticated && (
              <div className="flex items-center border border-[rgba(0,0,0,0.15)] text-[11px] sm:text-[12px]">
                <button
                  type="button"
                  onClick={() => handleSwitchSection('work')}
                  className={`px-2.5 sm:px-3 py-1 flex items-center gap-1 ${mainSection === 'work' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}
                >
                  <Briefcase size={11} />
                  <span>Work & 사진 관리</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSection('about')}
                  className={`px-2.5 sm:px-3 py-1 flex items-center gap-1 ${mainSection === 'about' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}
                >
                  <User size={11} />
                  <span>About 소개글</span>
                </button>
              </div>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  accept=".json"
                  ref={importFileInputRef}
                  onChange={handleImportData}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleExportData}
                  className="text-[11px] border border-[rgba(0,0,0,0.2)] bg-neutral-50 hover:bg-neutral-100 text-black px-2 py-1 flex items-center gap-1 cursor-pointer transition-colors"
                  title="전체 데이터 및 사진을 내 컴퓨터로 백업 다운로드"
                >
                  <Download size={11} />
                  <span>백업 저장</span>
                </button>
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="text-[11px] border border-[rgba(0,0,0,0.2)] bg-neutral-50 hover:bg-neutral-100 text-black px-2 py-1 flex items-center gap-1 cursor-pointer transition-colors"
                  title="내 컴퓨터의 백업 파일(JSON)에서 복원"
                >
                  <Upload size={11} />
                  <span>백업 불러오기</span>
                </button>
              </div>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] text-[rgba(0,0,0,0.5)] hover:text-black underline cursor-pointer"
                title="로그아웃"
              >
                로그아웃
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[rgba(0,0,0,0.5)] hover:text-black p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-[13px]">
          {!isAuthenticated ? (
            /* Password Authentication Screen */
            <form onSubmit={handleLogin} className="space-y-4 py-8">
              <div className="text-center space-y-1">
                <div className="font-normal text-black text-[14px]">본인 인증 (Admin)</div>
                <div className="text-[12px] text-[rgba(0,0,0,0.5)]">
                  사이트 소유자(leehyejun) 전용 비밀번호를 입력하세요.
                </div>
              </div>

              <div className="max-w-xs mx-auto space-y-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  autoFocus
                  className="w-full border border-[rgba(0,0,0,0.3)] px-3 py-2 text-[13px] focus:outline-none focus:border-black"
                />
                {errorMsg && (
                  <div className="text-[12px] text-red-600">{errorMsg}</div>
                )}
                <button
                  type="submit"
                  className="w-full bg-black text-white py-2 text-[13px] hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  인증하고 시작하기
                </button>
              </div>
            </form>
          ) : mainSection === 'about' ? (
            /* ============================================================== */
            /* 1. ABOUT EDITING FORM                                         */
            /* ============================================================== */
            <form onSubmit={handleSaveAbout} className="space-y-4">
              <div className="font-normal text-black pb-2 border-b border-[rgba(0,0,0,0.15)] flex justify-between items-center">
                <span>About 정보 직접 수정</span>
                <span className="text-[11px] text-[rgba(0,0,0,0.45)]">저장 시 웹사이트 및 모바일에 즉시 자동 배포됩니다</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    직함 (Role)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.role || ''}
                    onChange={(e) => setAboutForm({ ...aboutForm, role: e.target.value })}
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    활동 지역 (Location)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.location || ''}
                    onChange={(e) => setAboutForm({ ...aboutForm, location: e.target.value })}
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    이름 (Name)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.name || ''}
                    onChange={(e) => setAboutForm({ ...aboutForm, name: e.target.value })}
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    이메일 (Email)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.contact?.email || ''}
                    onChange={(e) =>
                      setAboutForm({
                        ...aboutForm,
                        contact: {
                          ...(aboutForm.contact || { email: '', instagram: '', linkedin: '', github: '' }),
                          email: e.target.value,
                        },
                      })
                    }
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                  소개 문구 (Bio)
                </label>
                <textarea
                  rows={4}
                  value={aboutForm.bio || ''}
                  onChange={(e) => setAboutForm({ ...aboutForm, bio: e.target.value })}
                  className="w-full border border-[rgba(0,0,0,0.25)] p-3 text-[13px] leading-relaxed focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(0,0,0,0.15)] flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-5 py-2 text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSaved ? <Check size={14} /> : <Plus size={14} />}
                  <span>{isSaved ? '적용 완료!' : '+ 웹사이트에 즉시 적용 (Publish)'}</span>
                </button>
              </div>
            </form>
          ) : mainSection === 'resume' ? (
            /* ============================================================== */
            /* 2. RESUME EDITING FORM                                        */
            /* ============================================================== */
            <form onSubmit={handleSaveResume} className="space-y-6">
              <div className="font-normal text-black pb-2 border-b border-[rgba(0,0,0,0.15)] flex justify-between items-center">
                <span>Resume 내용 직접 수정</span>
                <span className="text-[11px] text-[rgba(0,0,0,0.45)]">저장 시 웹사이트 및 모바일에 즉시 자동 배포됩니다</span>
              </div>

              {/* 1. 교육 */}
              <div className="space-y-2">
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                  1. 교육 (Education)
                </label>
                {(resumeForm.education || []).map((edu, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="학교명"
                      value={edu.school}
                      onChange={(e) => {
                        const copy = resumeForm.education ? [...resumeForm.education] : [];
                        copy[idx].school = e.target.value;
                        setResumeForm({ ...resumeForm, education: copy });
                      }}
                      className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                    />
                    <input
                      type="text"
                      placeholder="전공"
                      value={edu.major}
                      onChange={(e) => {
                        const copy = resumeForm.education ? [...resumeForm.education] : [];
                        copy[idx].major = e.target.value;
                        setResumeForm({ ...resumeForm, education: copy });
                      }}
                      className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                    />
                    <input
                      type="text"
                      placeholder="기간 (예: 2019년 졸업)"
                      value={edu.period}
                      onChange={(e) => {
                        const copy = resumeForm.education ? [...resumeForm.education] : [];
                        copy[idx].period = e.target.value;
                        setResumeForm({ ...resumeForm, education: copy });
                      }}
                      className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                    />
                  </div>
                ))}
              </div>

              {/* 2. 경력 사항 (Experience) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                    2. 경력 사항 (Experience)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = resumeForm.experience ? [...resumeForm.experience] : [];
                      copy.unshift({
                        company: '',
                        role: '',
                        period: '',
                        tasks: [''],
                      });
                      setResumeForm({ ...resumeForm, experience: copy });
                    }}
                    className="text-[11px] text-black underline"
                  >
                    + 경력 추가
                  </button>
                </div>

                <div>
                  <label className="block text-[10.5px] text-[rgba(0,0,0,0.4)] mb-1">
                    총 경력 요약 (예: 총 6년 2개월)
                  </label>
                  <input
                    type="text"
                    placeholder="총 6년 2개월"
                    value={resumeForm.totalExperience || ''}
                    onChange={(e) =>
                      setResumeForm({ ...resumeForm, totalExperience: e.target.value })
                    }
                    className="w-full sm:w-64 border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px] bg-white"
                  />
                </div>

                {(resumeForm.experience || []).map((exp, idx) => (
                  <div key={idx} className="p-3 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[12px]">경력 #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = (resumeForm.experience || []).filter((_, i) => i !== idx);
                          setResumeForm({ ...resumeForm, experience: copy });
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="회사명"
                        value={exp.company}
                        onChange={(e) => {
                          const copy = resumeForm.experience ? [...resumeForm.experience] : [];
                          copy[idx].company = e.target.value;
                          setResumeForm({ ...resumeForm, experience: copy });
                        }}
                        className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12px] bg-white"
                      />
                      <input
                        type="text"
                        placeholder="직책 / 팀 (디자인팀 · 대리)"
                        value={exp.role}
                        onChange={(e) => {
                          const copy = resumeForm.experience ? [...resumeForm.experience] : [];
                          copy[idx].role = e.target.value;
                          setResumeForm({ ...resumeForm, experience: copy });
                        }}
                        className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12px] bg-white"
                      />
                      <input
                        type="text"
                        placeholder="기간 (2022.11 - 2026.06)"
                        value={exp.period}
                        onChange={(e) => {
                          const copy = [...resumeForm.experience];
                          copy[idx].period = e.target.value;
                          setResumeForm({ ...resumeForm, experience: copy });
                        }}
                        className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12px] bg-white"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] text-[rgba(0,0,0,0.4)] mb-1">
                        담당 업무 (줄바꿈으로 구분)
                      </div>
                      <textarea
                        rows={3}
                        value={(exp.tasks || []).join('\n')}
                        onChange={(e) => {
                          const copy = [...resumeForm.experience];
                          copy[idx].tasks = e.target.value.split('\n').filter(Boolean);
                          setResumeForm({ ...resumeForm, experience: copy });
                        }}
                        placeholder="가구 기획 및 디자인 개발&#10;제품 발주 및 생산관리"
                        className="w-full border border-[rgba(0,0,0,0.25)] p-2 text-[12px] bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. 경험 및 활동 (Honors & Activities) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                    3. 경험 및 수상 (Honors & Activities)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = resumeForm.honors ? [...resumeForm.honors] : [];
                      copy.push({ title: '', period: '' });
                      setResumeForm({ ...resumeForm, honors: copy });
                    }}
                    className="text-[11px] text-black underline"
                  >
                    + 항목 추가
                  </button>
                </div>
                {(resumeForm.honors || []).map((h, idx) => {
                  const slug = getHonorSlug(h.title, idx);
                  const matchingExp = getExperienceProjects().find((e) => e.slug === slug);

                  return (
                    <div key={idx} className="p-2.5 border border-[rgba(0,0,0,0.12)] bg-white space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="수상 / 경험 내역"
                          value={h.title}
                          onChange={(e) => {
                            const copy = [...(resumeForm.honors || [])];
                            copy[idx].title = e.target.value;
                            setResumeForm({ ...resumeForm, honors: copy });
                          }}
                          className="flex-1 border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                        />
                        <input
                          type="text"
                          placeholder="연도"
                          value={h.period}
                          onChange={(e) => {
                            const copy = [...(resumeForm.honors || [])];
                            copy[idx].period = e.target.value;
                            setResumeForm({ ...resumeForm, honors: copy });
                          }}
                          className="w-24 border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = (resumeForm.honors || []).filter((_, i) => i !== idx);
                            setResumeForm({ ...resumeForm, honors: copy });
                          }}
                          className="text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {matchingExp && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[rgba(0,0,0,0.06)]">
                          <span className="text-[rgba(0,0,0,0.5)]">
                            연결된 상세 More 아카이브: <strong className="text-black font-normal">{matchingExp.title}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMainSection('work');
                              handleSelectProjectToEdit(matchingExp);
                            }}
                            className="text-black underline font-medium hover:opacity-75 cursor-pointer"
                          >
                            상세 내용 / 사진 편집하기 →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 4. 자격 및 소프트웨어 능력 */}
              <div className="space-y-2">
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                  4. 자격 및 소프트웨어 능력 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  placeholder="보유 스킬 (예: Auto CAD, Adobe softwares, Sketch Up, 3D MAX)"
                  value={(resumeForm.skills || []).join(', ')}
                  onChange={(e) =>
                    setResumeForm({
                      ...resumeForm,
                      skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full border border-[rgba(0,0,0,0.25)] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(0,0,0,0.15)] flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-5 py-2 text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSaved ? <Check size={14} /> : <Plus size={14} />}
                  <span>{isSaved ? '적용 완료!' : '+ 웹사이트에 즉시 적용 (Publish)'}</span>
                </button>
              </div>
            </form>
          ) : workTab === 'list' ? (
            /* ============================================================== */
            /* 3. WORK PROJECTS LIST VIEW                                    */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[rgba(0,0,0,0.15)]">
                <span className="font-normal text-black">등록된 프로젝트 목록</span>
                <button
                  onClick={handleNewProject}
                  className="text-[12px] bg-black text-white px-2.5 py-1 flex items-center gap-1 hover:bg-neutral-800"
                >
                  <Plus size={12} />
                  <span>+ 새 프로젝트 추가</span>
                </button>
              </div>

              <div className="divide-y divide-[rgba(0,0,0,0.1)]">
                {(projectsList || []).filter((p): p is WorkProject => Boolean(p && p.slug)).map((p) => (
                  <div key={p.slug} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-[rgba(0,0,0,0.4)]">
                        #{p.order}
                      </span>
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt=""
                          className="w-8 h-10 object-cover border border-[rgba(0,0,0,0.1)] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-neutral-100 border border-[rgba(0,0,0,0.1)] flex items-center justify-center shrink-0">
                          <ImageIcon size={12} className="text-neutral-400" />
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-normal text-black truncate">{p.title}</div>
                        <div className="text-[11px] text-[rgba(0,0,0,0.45)]">
                          {p.materials} · {p.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSelectProjectToEdit(p)}
                        className="text-[12px] border border-[rgba(0,0,0,0.2)] px-2 py-1 flex items-center gap-1 hover:bg-neutral-50"
                      >
                        <Edit3 size={11} />
                        <span>수정</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.slug)}
                        className="text-[12px] text-red-600 border border-red-200 px-2 py-1 flex items-center gap-1 hover:bg-red-50"
                      >
                        <Trash2 size={11} />
                        <span>삭제</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 경험 아카이브 프로젝트 (Resume 상세 전용) */}
              <div className="pt-5 border-t border-[rgba(0,0,0,0.15)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                  <div className="font-medium text-[13px] text-black">
                    경험 아카이브 프로젝트 (Resume 상세 전용)
                  </div>
                  <span className="text-[11px] text-[rgba(0,0,0,0.45)]">
                    *Work 목록에는 숨겨져 있으며, Resume 경험 항목을 클릭했을 때 More 탭에 열립니다.
                  </span>
                </div>
                <div className="space-y-2">
                  {getExperienceProjects().map((exp) => (
                    <div
                      key={exp.slug}
                      className="p-3 border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="text-[13px] font-medium text-black truncate">{exp.title}</div>
                        <div className="text-[11px] text-[rgba(0,0,0,0.5)] truncate">
                          {exp.materials} · {exp.dimensions}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectProjectToEdit(exp)}
                        className="text-[12px] bg-white border border-[rgba(0,0,0,0.2)] px-2.5 py-1 flex items-center gap-1 hover:bg-neutral-100 cursor-pointer shrink-0"
                      >
                        <Edit3 size={11} />
                        <span>상세 내용/사진 수정</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* 4. WORK PROJECT EDIT / CREATE FORM                            */
            /* ============================================================== */
            <form onSubmit={handlePublishWork} className="space-y-4">
              {/* Quick Project Slot Selector Bar */}
              <div className="space-y-2 pb-2.5 border-b border-[rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between text-[11px] text-[rgba(0,0,0,0.5)]">
                  <span>수정할 프로젝트 선택:</span>
                  <span className="text-[11px] text-neutral-500 font-mono">Work 및 Resume 경험 프로젝트를 선택하여 사진과 내용을 관리할 수 있습니다</span>
                </div>
                
                {/* 1. Work Projects Row */}
                <div className="space-y-1">
                  <div className="text-[10.5px] font-bold text-neutral-600 uppercase tracking-wider">Work 프로젝트</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {draftProjects.map((p) => {
                      const isSelected = editingSlug === p.slug;
                      const isModified = modifiedSlugs.has(p.slug);
                      return (
                        <button
                          key={p.slug}
                          type="button"
                          onClick={() => handleSelectProjectToEdit(p)}
                          className={`px-3 py-1.5 text-[12px] border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-black text-white border-black font-medium'
                              : 'bg-white text-black border-[rgba(0,0,0,0.2)] hover:border-black'
                          }`}
                        >
                          <span className={`font-mono ${isSelected ? 'text-neutral-300' : 'text-[rgba(0,0,0,0.45)]'}`}>
                            #{p.order}
                          </span>
                          <span className="max-w-[130px] truncate">{p.title || 'Untitled'}</span>
                          {isModified && (
                            <span className="text-[10px] text-amber-500 font-bold" title="수정 중">●</span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleNewProject}
                      className={`px-3 py-1.5 text-[12px] border border-dashed transition-colors cursor-pointer shrink-0 ${
                        !editingSlug
                          ? 'bg-black text-white border-black font-medium'
                          : 'bg-neutral-50 text-[rgba(0,0,0,0.6)] border-[rgba(0,0,0,0.3)] hover:text-black hover:border-black'
                      }`}
                    >
                      + 새 프로젝트 추가
                    </button>
                  </div>
                </div>

                {/* 2. Experience Projects Row */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10.5px] font-bold text-neutral-600 uppercase tracking-wider">Resume 경험 프로젝트 (More 사진 관리)</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {draftExperiences.map((exp) => {
                      const isSelected = editingSlug === exp.slug;
                      const isModified = modifiedSlugs.has(exp.slug);
                      return (
                        <button
                          key={exp.slug}
                          type="button"
                          onClick={() => handleSelectProjectToEdit(exp)}
                          className={`px-3 py-1.5 text-[12px] border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                              : 'bg-neutral-50 text-black border-[rgba(0,0,0,0.2)] hover:border-black'
                          }`}
                        >
                          <span className="text-[10.5px] px-1 bg-neutral-200 text-neutral-800 rounded font-mono">경험</span>
                          <span className="max-w-[150px] truncate">{exp.title || 'Untitled'}</span>
                          <span className="text-[11px] opacity-60 font-mono">({(exp.images || []).length}장)</span>
                          {isModified && (
                            <span className="text-[10px] text-amber-500 font-bold" title="수정 중">●</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-neutral-50 p-2.5 border border-[rgba(0,0,0,0.1)] text-[12px]">
                <span>
                  {editingSlug ? (
                    <>현재 <strong>{title}</strong> 프로젝트를 수정 중입니다.</>
                  ) : (
                    <>새 프로젝트를 작성 중입니다.</>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkTab('list')}
                    className="text-black underline cursor-pointer"
                  >
                    목록 보기
                  </button>
                  {editingSlug && (
                    <button
                      type="button"
                      onClick={handleNewProject}
                      className="text-black underline cursor-pointer"
                    >
                      + 새 프로젝트 작성으로 전환
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-9">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    프로젝트명 (Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="예: Mobile Display System"
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    순서 (Order)
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              {/* Materials & Dimensions & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    재료 (Materials)
                  </label>
                  <input
                    type="text"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="Aluminum Extrusions..."
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    규격 (Dimensions)
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="Various Dimensions"
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    제작연도 (Year)
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="2025"
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/* 1. Work 대표사진 (Work 메인 피드에 노출될 사진)              */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-normal text-black text-[12.5px]">
                    🖼️ <strong>Work 대표사진</strong> (메인 피드 카드에 크게 노출될 대표 사진)
                  </span>
                  {thumbnail && (
                    <button
                      type="button"
                      onClick={() => setThumbnail('')}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      대표사진 삭제
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-3">
                  {thumbnail ? (
                    <div className="w-24 h-32 border border-[rgba(0,0,0,0.2)] overflow-hidden shrink-0 bg-white">
                      <img src={thumbnail} alt="대표사진" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-32 border border-dashed border-[rgba(0,0,0,0.25)] flex flex-col items-center justify-center text-center p-2 text-[10px] text-[rgba(0,0,0,0.4)] shrink-0 bg-white">
                      <ImageIcon size={20} />
                      <span className="mt-1">사진 등록</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={thumbnailFileInputRef}
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => thumbnailFileInputRef.current?.click()}
                        disabled={isCompressing}
                        className="text-[12px] border border-black bg-white px-3 py-1.5 flex items-center gap-1.5 hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                      >
                        {isCompressing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        <span>컴퓨터에서 사진 선택 (자동 최적화)</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-[rgba(0,0,0,0.4)]">또는 이미지 웹 URL 직접 입력:</div>
                    <input
                      type="text"
                      value={thumbnail.startsWith('data:') ? '' : thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://... 또는 /images/work/photo.jpg"
                      className="w-full border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12px] bg-white focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 2. More 세부사진 목록 (우측 Photos 섹션에 노출)        */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-normal text-black text-[12.5px]">
                    📸 <strong>More 세부사진 목록</strong> (우측 Photos 섹션에 나열될 상세 컷들)
                  </span>
                  <span className="text-[11px] text-[rgba(0,0,0,0.45)]">
                    총 {detailImages.length}장
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={detailFileInputRef}
                    onChange={handleDetailImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => detailFileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="text-[12px] border border-black bg-white px-3 py-1.5 flex items-center gap-1.5 hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                  >
                    {isCompressing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <span>세부사진 추가 (여러 장 선택 가능)</span>
                  </button>

                  <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={newDetailUrl}
                      onChange={(e) => setNewDetailUrl(e.target.value)}
                      placeholder="이미지 URL 직접 추가"
                      className="flex-1 border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12px] bg-white focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={handleAddDetailUrl}
                      className="text-[12px] border border-[rgba(0,0,0,0.3)] bg-white px-2 py-1 hover:bg-neutral-100"
                    >
                      추가
                    </button>
                  </div>
                </div>

                {/* Detail Images Grid Preview with Drag & Drop Reordering */}
                {detailImages.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-[rgba(0,0,0,0.55)] bg-white px-2 py-1.5 border border-[rgba(0,0,0,0.1)]">
                      <span className="flex items-center gap-1.5">
                        <GripVertical size={13} className="text-neutral-500" />
                        <span><strong>드래그 & 드롭</strong>으로 사진 순서를 자유롭게 바꿀 수 있습니다. (마우스로 끌어서 이동 또는 ◀ ▶ 클릭)</span>
                      </span>
                      <span className="font-mono text-[10.5px] text-[rgba(0,0,0,0.4)]">총 {detailImages.length}장</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {detailImages.map((imgSrc, idx) => {
                        const isDragging = draggedDetailIdx === idx;
                        const isOver = dragOverDetailIdx === idx && !isDragging;

                        return (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => handleDragStartDetail(e, idx)}
                            onDragEnter={(e) => handleDragEnterDetail(e, idx)}
                            onDragOver={handleDragOverDetail}
                            onDrop={(e) => handleDropDetail(e, idx)}
                            onDragEnd={handleDragEndDetail}
                            className={`relative group bg-white border h-28 overflow-hidden transition-all select-none cursor-grab active:cursor-grabbing ${
                              isDragging
                                ? 'opacity-30 scale-95 border-2 border-dashed border-black'
                                : isOver
                                ? 'ring-2 ring-black border-black scale-[1.02] shadow-md z-10'
                                : 'border-[rgba(0,0,0,0.2)] hover:border-black hover:shadow-xs'
                            }`}
                          >
                            <img
                              src={imgSrc}
                              alt={`Detail ${idx + 1}`}
                              className="w-full h-full object-cover pointer-events-none"
                            />

                            {/* Drag Indicator Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />

                            {/* Top Left: Order Badge & Drag Grip Handle */}
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
                              <span className="bg-black/85 text-white text-[10px] px-1.5 py-0.5 font-mono font-medium shadow-xs">
                                #{idx + 1}
                              </span>
                              <div
                                className="bg-white/90 text-black p-0.5 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="드래그하여 이동"
                              >
                                <GripVertical size={11} />
                              </div>
                            </div>

                            {/* Top Right: Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveDetailImage(idx);
                              }}
                              className="absolute top-1.5 right-1.5 bg-black/80 text-white p-1 rounded-xs hover:bg-red-600 transition-colors cursor-pointer shadow-xs z-10"
                              title="사진 삭제"
                            >
                              <X size={11} />
                            </button>

                            {/* Bottom Controls Bar on Hover: ◀ Left, Set as Thumbnail, Right ▶ */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-1.5 pt-3.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveDetailStep(idx, 'left');
                                  }}
                                  className="text-white bg-black/70 hover:bg-black p-1 disabled:opacity-25 disabled:hover:bg-black/70 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="왼쪽(앞)으로 이동"
                                >
                                  <ChevronLeft size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === detailImages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveDetailStep(idx, 'right');
                                  }}
                                  className="text-white bg-black/70 hover:bg-black p-1 disabled:opacity-25 disabled:hover:bg-black/70 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="오른쪽(뒤)으로 이동"
                                >
                                  <ChevronRight size={11} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setThumbnail(imgSrc);
                                }}
                                className="text-[9.5px] bg-white text-black px-1.5 py-0.5 font-normal hover:bg-neutral-200 cursor-pointer transition-colors shadow-xs"
                                title="이 사진을 Work 대표사진으로 설정"
                              >
                                대표로 지정
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[rgba(0,0,0,0.4)] py-1">
                    등록된 세부사진이 없습니다. (미등록 시 시스템 기본 도면 플레이트가 표시됩니다)
                  </div>
                )}
              </div>

              {/* Markdown Content (More 상세 본문) */}
              <div>
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                  More 본문 설명 (Markdown / Text)
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="프로젝트 상세 설명 내용을 작성하세요..."
                  className="w-full border border-[rgba(0,0,0,0.25)] p-3 text-[13px] leading-relaxed focus:outline-none focus:border-black font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[rgba(0,0,0,0.15)] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDownloadMdx}
                  className="inline-flex items-center gap-1.5 text-[12px] border border-[rgba(0,0,0,0.3)] px-3 py-2 hover:bg-neutral-50 transition-colors"
                >
                  <Download size={13} />
                  <span>Download .mdx</span>
                </button>

                <button
                  type="submit"
                  disabled={isCompressing}
                  className="inline-flex items-center gap-1.5 bg-black text-white px-5 py-2 text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaved ? <Check size={14} /> : <Plus size={14} />}
                  <span>{isSaved ? '적용 완료!' : '웹사이트에 즉시 적용 (Publish)'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Discreet Data Sync & Transfer Bar (내보내기 / 불러오기) */}
        {isAuthenticated && (
          <div className="px-5 py-2.5 bg-neutral-50 border-t border-[rgba(0,0,0,0.1)] flex flex-wrap items-center justify-between text-[11px] text-[rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-1.5">
              <span>💡 다른 컴퓨터로 옮기거나 백업할 때:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                ref={importFileInputRef}
                onChange={handleImportData}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="underline hover:text-black cursor-pointer font-medium"
              >
                [데이터 불러오기 (Import)]
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleExportData}
                className="underline hover:text-black cursor-pointer font-medium"
              >
                [전체 데이터 백업 (Export)]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
