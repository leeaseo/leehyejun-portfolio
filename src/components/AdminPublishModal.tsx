import React, { useState, useRef, useEffect } from 'react';
import {
  WorkProject,
  AboutData,
  ResumeData,
  ResumeExperience,
  ResumeHonor,
  ContributionPhase,
  MoreProcessBlock,
} from '../lib/types';
import {
  ContributionLineGauge,
  getDefaultContribution,
  buildEditorialBlocks,
} from './MoreColumn';
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
  Crop,
} from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 4500);
  };

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
  const [brand, setBrand] = useState('');
  const [materials, setMaterials] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [externalUrl, setExternalUrl] = useState('');
  const [content, setContent] = useState('');

  // Photo 탭 대표사진 & 최종 촬영 이미지 + More 탭 디벨롭/양산화 과정 이미지
  const [thumbnail, setThumbnail] = useState<string>('');
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [newDetailUrl, setNewDetailUrl] = useState('');
  const [processImages, setProcessImages] = useState<string[]>([]);
  const [newProcessUrl, setNewProcessUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // More 탭 기여도(CONTRIBUTION) 퍼센트 조절 및 디벨롭 블록(대표/서브 이미지 + 우측 설명) 상태
  const [contributionPhases, setContributionPhases] = useState<ContributionPhase[]>([
    { label: '기획 / 조형 디자인', percent: 100 },
    { label: '2D CAD / 3D 설계', percent: 100 },
    { label: '샘플 / 양산 감리', percent: 80 },
  ]);
  const [moreBlocks, setMoreBlocks] = useState<MoreProcessBlock[]>([]);
  const [activeBlockUploadIdx, setActiveBlockUploadIdx] = useState<number>(0);
  const [newBlockImageUrls, setNewBlockImageUrls] = useState<Record<number, string>>({});

  // Image Cropper State
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    type:
      | 'thumbnail'
      | 'detail-new'
      | 'detail-edit'
      | 'process-new'
      | 'process-edit'
      | 'block-new'
      | 'block-edit';
    imageSrc: string;
    title: string;
    subtitle?: string;
    queue?: { rawSrc: string; file?: File }[];
    queueIndex?: number;
    detailEditIndex?: number;
    blockIndex?: number;
  }>({
    isOpen: false,
    type: 'thumbnail',
    imageSrc: '',
    title: '',
  });

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
    const isExp =
      (typeof proj.order === 'number' && proj.order >= 100) || isExperienceSlug(proj.slug);
    setBrand(
      proj.brand || (isExp ? 'Exhibition / Independent Project' : 'CHALS FURNITURE (찰스퍼니처)')
    );
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
    setProcessImages(Array.isArray(proj.processImages) ? proj.processImages.filter(Boolean) : []);

    // Load Contribution phases
    const defaultContrib = getDefaultContribution(proj);
    setContributionPhases(
      defaultContrib.phases.map((ph) => ({
        label: ph.label,
        percent: typeof ph.percent === 'number' ? ph.percent : 100,
      }))
    );

    // Load More Editorial Blocks (대표/서브 이미지 + 우측 설명)
    const builtBlocks = buildEditorialBlocks(proj);
    setMoreBlocks(
      builtBlocks.map((b, idx) => ({
        id: b.id || `block-${idx + 1}`,
        title: b.title || '',
        images: Array.isArray(b.images) ? [...b.images] : [],
        description: b.description || '',
      }))
    );

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
    if (!currentSlug && !activeTitle && !thumbnail && detailImages.length === 0 && processImages.length === 0) return;

    const targetSlug =
      currentSlug ||
      slug.trim() ||
      activeTitle.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').trim().replace(/\s+/g, '-') ||
      `project-${Date.now()}`;

    const syncedContent =
      moreBlocks.length > 0
        ? moreBlocks
            .map((b) => `${b.title ? `### ${b.title}\n` : ''}${b.description || ''}`.trim())
            .filter(Boolean)
            .join('\n\n')
        : content;

    const currentData: WorkProject = {
      title: activeTitle || 'Untitled',
      slug: targetSlug,
      date: date || '2026',
      brand: brand.trim() || 'CHALS FURNITURE (찰스퍼니처)',
      thumbnail: thumbnail || '',
      images: detailImages,
      processImages: processImages,
      contribution: {
        phases: contributionPhases.filter((ph) => ph.label.trim() !== ''),
      },
      moreBlocks: moreBlocks,
      materials: materials || 'Aluminum Extrusions, Hardware',
      dimensions: dimensions || 'Various Dimensions',
      externalUrl: externalUrl || undefined,
      order: Number(order) || (draftProjects.length + 1),
      content: syncedContent || content || '프로젝트 상세 내용입니다.',
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
  const processFileInputRef = useRef<HTMLInputElement>(null);
  const blockFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = async () => {
    try {
      showToast('📦 사진과 데이터를 포함한 올인원 백업 파일을 생성 중입니다...');
      const res = await fetch('/api/backup-full');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `custom-data.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('✅ 사진 135장이 모두 포함된 custom-data.json이 다운로드되었습니다! 깃허브에 업로드하시면 사진이 즉시 정상 출력됩니다.');
        return;
      }
    } catch {}

    // Fallback: Convert client images to base64
    const urlToBase64 = async (imgUrl: string): Promise<string> => {
      if (!imgUrl || imgUrl.startsWith('data:') || imgUrl.startsWith('http')) return imgUrl;
      try {
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(imgUrl);
          reader.readAsDataURL(blob);
        });
      } catch {
        return imgUrl;
      }
    };

    const rawProjs = getAllProjects();
    const projsWithImages = await Promise.all(
      rawProjs.map(async (p) => ({
        ...p,
        thumbnail: await urlToBase64(p.thumbnail),
        images: await Promise.all((p.images || []).map(urlToBase64)),
      }))
    );

    const data = {
      about: getAboutData(),
      resume: getResumeData(),
      projects: projsWithImages,
      experiences: getExperienceProjects(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom-data.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ 사진 135장이 모두 포함된 custom-data.json이 다운로드되었습니다! 깃허브에 업로드하시면 사진이 즉시 정상 출력됩니다.');
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

  // Work 대표사진 파일 업로드 -> 크롭 모달 열기
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawSrc = event.target?.result as string;
        if (rawSrc) {
          setCropperState({
            isOpen: true,
            type: 'thumbnail',
            imageSrc: rawSrc,
            title: 'Work 대표사진 자르기 & 비율 조절',
            subtitle: '메인 피드 카드에 노출될 대표 이미지',
            queue: [{ rawSrc, file }],
            queueIndex: 0,
          });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // Photo 탭 추가 촬영컷 파일 업로드 (여러 장 선택 지원) -> 크롭 큐 순차 처리
  const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const queue: { rawSrc: string; file?: File }[] = [];
      for (const file of Array.from(files)) {
        const rawSrc = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(file);
        });
        queue.push({ rawSrc, file });
      }

      if (queue.length > 0) {
        setCropperState({
          isOpen: true,
          type: 'detail-new',
          imageSrc: queue[0].rawSrc,
          title: queue.length > 1 ? `Photo 촬영컷 자르기 (1 / ${queue.length})` : 'Photo 촬영컷 자르기 & 비율 조절',
          subtitle: '가운데 Photo 탭에 노출될 제품 최종 촬영 이미지',
          queue,
          queueIndex: 0,
        });
      }
      e.target.value = '';
    }
  };

  // More 탭 디벨롭 & 양산화 과정 (비핸스 갤러리) 이미지 파일 업로드
  const handleProcessImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const queue: { rawSrc: string; file?: File }[] = [];
      for (const file of Array.from(files)) {
        const rawSrc = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(file);
        });
        queue.push({ rawSrc, file });
      }

      if (queue.length > 0) {
        setCropperState({
          isOpen: true,
          type: 'process-new',
          imageSrc: queue[0].rawSrc,
          title: queue.length > 1 ? `More 양산화/디벨롭 보드 자르기 (1 / ${queue.length})` : 'More 양산화/디벨롭 보드 자르기 & 비율 조절',
          subtitle: '맨 오른쪽 More 탭에 노출될 디벨롭·양산화 과정 이미지',
          queue,
          queueIndex: 0,
        });
      }
      e.target.value = '';
    }
  };

  // More 탭 특정 블록(1.1, 1.2, 1.3...)에 이미지 파일 업로드
  const handleBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const targetBlockIdx = activeBlockUploadIdx;
    if (files && files.length > 0) {
      const queue: { rawSrc: string; file?: File }[] = [];
      for (const file of Array.from(files)) {
        const rawSrc = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(file);
        });
        queue.push({ rawSrc, file });
      }

      if (queue.length > 0) {
        setCropperState({
          isOpen: true,
          type: 'block-new',
          blockIndex: targetBlockIdx,
          imageSrc: queue[0].rawSrc,
          title:
            queue.length > 1
              ? `More 블록 #${targetBlockIdx + 1} 이미지 자르기 (1 / ${queue.length})`
              : `More 블록 #${targetBlockIdx + 1} 이미지 자르기 & 비율 조절`,
          subtitle: `블록 #${targetBlockIdx + 1}의 대표(${targetBlockIdx + 1}.1) 및 서브 이미지`,
          queue,
          queueIndex: 0,
        });
      }
      e.target.value = '';
    }
  };

  // 크롭 완료 콜백
  const handleCropComplete = (croppedDataUrl: string) => {
    if (cropperState.type === 'thumbnail') {
      setThumbnail(croppedDataUrl);
      setCropperState((prev) => ({ ...prev, isOpen: false }));
    } else if (cropperState.type === 'detail-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const nextIdx = currentIdx + 1;

      setDetailImages((prev) => [...prev, croppedDataUrl]);

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `Photo 촬영컷 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (cropperState.type === 'detail-edit') {
      if (cropperState.detailEditIndex !== undefined) {
        const editIdx = cropperState.detailEditIndex;
        setDetailImages((prev) => {
          const next = [...prev];
          next[editIdx] = croppedDataUrl;
          return next;
        });
      }
      setCropperState((prev) => ({ ...prev, isOpen: false }));
    } else if (cropperState.type === 'process-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const nextIdx = currentIdx + 1;

      setProcessImages((prev) => [...prev, croppedDataUrl]);

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `More 양산화/디벨롭 보드 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (cropperState.type === 'process-edit') {
      if (cropperState.detailEditIndex !== undefined) {
        const editIdx = cropperState.detailEditIndex;
        setProcessImages((prev) => {
          const next = [...prev];
          next[editIdx] = croppedDataUrl;
          return next;
        });
      }
      setCropperState((prev) => ({ ...prev, isOpen: false }));
    } else if (cropperState.type === 'block-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const nextIdx = currentIdx + 1;
      const bIdx = cropperState.blockIndex ?? 0;

      setMoreBlocks((prev) => {
        const next = [...prev];
        if (next[bIdx]) {
          next[bIdx] = {
            ...next[bIdx],
            images: [...(next[bIdx].images || []), croppedDataUrl],
          };
        }
        return next;
      });

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `More 블록 #${bIdx + 1} 이미지 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (cropperState.type === 'block-edit') {
      const bIdx = cropperState.blockIndex ?? 0;
      const editIdx = cropperState.detailEditIndex;
      if (editIdx !== undefined) {
        setMoreBlocks((prev) => {
          const next = [...prev];
          if (next[bIdx] && Array.isArray(next[bIdx].images)) {
            const imgs = [...next[bIdx].images];
            imgs[editIdx] = croppedDataUrl;
            next[bIdx] = { ...next[bIdx], images: imgs };
          }
          return next;
        });
      }
      setCropperState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // 크롭 건너뛰기 (원본 그대로 사용) 콜백
  const handleCropSkip = async () => {
    if (cropperState.type === 'thumbnail') {
      const item = cropperState.queue?.[0];
      try {
        setIsCompressing(true);
        const comp = item?.file
          ? await compressImageFile(item.file, 2560, 0.92)
          : cropperState.imageSrc;
        setThumbnail(comp);
      } catch (err) {
        console.error(err);
        setThumbnail(cropperState.imageSrc);
      } finally {
        setIsCompressing(false);
      }
      setCropperState((prev) => ({ ...prev, isOpen: false }));
    } else if (cropperState.type === 'detail-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const item = currentQueue[currentIdx];
      const nextIdx = currentIdx + 1;

      try {
        setIsCompressing(true);
        const comp = item?.file
          ? await compressImageFile(item.file, 2560, 0.92)
          : item.rawSrc;
        setDetailImages((prev) => [...prev, comp]);
      } catch (err) {
        console.error(err);
        setDetailImages((prev) => [...prev, item.rawSrc]);
      } finally {
        setIsCompressing(false);
      }

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `Photo 촬영컷 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (cropperState.type === 'process-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const item = currentQueue[currentIdx];
      const nextIdx = currentIdx + 1;

      try {
        setIsCompressing(true);
        const comp = item?.file
          ? await compressImageFile(item.file, 2560, 0.92)
          : item.rawSrc;
        setProcessImages((prev) => [...prev, comp]);
      } catch (err) {
        console.error(err);
        setProcessImages((prev) => [...prev, item.rawSrc]);
      } finally {
        setIsCompressing(false);
      }

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `More 양산화/디벨롭 보드 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (cropperState.type === 'block-new') {
      const currentQueue = cropperState.queue || [];
      const currentIdx = cropperState.queueIndex || 0;
      const item = currentQueue[currentIdx];
      const nextIdx = currentIdx + 1;
      const bIdx = cropperState.blockIndex ?? 0;

      try {
        setIsCompressing(true);
        const comp = item?.file
          ? await compressImageFile(item.file, 2560, 0.92)
          : item.rawSrc;
        setMoreBlocks((prev) => {
          const next = [...prev];
          if (next[bIdx]) {
            next[bIdx] = {
              ...next[bIdx],
              images: [...(next[bIdx].images || []), comp],
            };
          }
          return next;
        });
      } catch (err) {
        console.error(err);
        setMoreBlocks((prev) => {
          const next = [...prev];
          if (next[bIdx]) {
            next[bIdx] = {
              ...next[bIdx],
              images: [...(next[bIdx].images || []), item.rawSrc],
            };
          }
          return next;
        });
      } finally {
        setIsCompressing(false);
      }

      if (nextIdx < currentQueue.length) {
        setCropperState((prev) => ({
          ...prev,
          imageSrc: currentQueue[nextIdx].rawSrc,
          queueIndex: nextIdx,
          title: `More 블록 #${bIdx + 1} 이미지 자르기 (${nextIdx + 1} / ${currentQueue.length})`,
        }));
      } else {
        setCropperState((prev) => ({ ...prev, isOpen: false }));
      }
    } else {
      setCropperState((prev) => ({ ...prev, isOpen: false }));
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

  const handleAddProcessUrl = () => {
    if (newProcessUrl.trim()) {
      setProcessImages((prev) => [...prev, newProcessUrl.trim()]);
      setNewProcessUrl('');
    }
  };

  const handleRemoveProcessImage = (indexToRemove: number) => {
    setProcessImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveProcessStep = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= processImages.length) return;
    setProcessImages((prev) => {
      const copy = [...prev];
      const [movedItem] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, movedItem);
      return copy;
    });
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
    setBrand('CHALS FURNITURE (찰스퍼니처)');
    setMaterials('');
    setDimensions('');
    const maxOrder = draftProjects.reduce((max, p) => Math.max(max, Number(p.order) || 0), 0);
    setOrder(maxOrder + 1);
    setExternalUrl('');
    setContent('');
    setThumbnail('');
    setDetailImages([]);
    setProcessImages([]);
    setContributionPhases([
      { label: '기획 / 조형 디자인', percent: 100 },
      { label: '2D CAD / 3D 설계', percent: 100 },
      { label: '샘플 / 양산 감리', percent: 80 },
    ]);
    setMoreBlocks([
      {
        id: 'block-1',
        title: '기획 배경 및 조형 콘셉트',
        images: [],
        description: '',
      },
    ]);
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

    if (activeSlug || activeTitle || thumbnail || detailImages.length > 0 || processImages.length > 0) {
      const targetSlug = activeSlug || `project-${Date.now()}`;
      const syncedContent =
        moreBlocks.length > 0
          ? moreBlocks
              .map((b) => `${b.title ? `### ${b.title}\n` : ''}${b.description || ''}`.trim())
              .filter(Boolean)
              .join('\n\n')
          : content;

      const currentProjectData: WorkProject = {
        title: activeTitle || 'Untitled',
        slug: targetSlug,
        date: date || '2026',
        brand: brand.trim() || 'CHALS FURNITURE (찰스퍼니처)',
        thumbnail: thumbnail || '',
        images: detailImages,
        processImages: processImages,
        contribution: {
          phases: contributionPhases.filter((ph) => ph.label.trim() !== ''),
        },
        moreBlocks: moreBlocks,
        materials: materials || 'Aluminum Extrusions, Hardware',
        dimensions: dimensions || 'Various Dimensions',
        externalUrl: externalUrl || undefined,
        order: Number(order) || (finalProjects.length + 1),
        content: syncedContent || content || '프로젝트 상세 내용입니다.',
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

              {/* Brand & Materials & Dimensions & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    브랜드 (Brand — 어느 브랜드에서 진행한 작업인지 기재)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="예: CHALS FURNITURE (찰스퍼니처)"
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    재료 (Materials)
                  </label>
                  <input
                    type="text"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="Solid Oak, Natural Linen..."
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    규격 (Dimensions)
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="W2100 x D950 x H780 mm"
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
                    placeholder="2026"
                    className="w-full border border-[rgba(0,0,0,0.25)] px-3 py-1.5 focus:outline-none focus:border-black text-[13px]"
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/* 1. Photo 탭 대표 촬영컷 (thumbnail)                            */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-normal text-black text-[12.5px]">
                    🖼️ <strong>Photo 대표 촬영컷</strong> (가운데 Photo 탭 최상단 및 목록 대표 사진)
                  </span>
                  {thumbnail && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCropperState({
                            isOpen: true,
                            type: 'thumbnail',
                            imageSrc: thumbnail,
                            title: 'Photo 대표 촬영컷 자르기 & 비율 조절',
                            subtitle: '가운데 Photo 탭 최상단 대표 촬영 이미지',
                          });
                        }}
                        className="text-[11px] border border-[rgba(0,0,0,0.25)] bg-white px-2 py-0.5 hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
                        title="대표사진 비율 조절 및 자르기"
                      >
                        <Crop size={11} />
                        <span>자르기 / 비율 조정</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnail('')}
                        className="text-[11px] text-red-600 hover:underline cursor-pointer"
                      >
                        대표사진 삭제
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-3">
                  {thumbnail ? (
                    <div className="relative group w-24 h-32 border border-[rgba(0,0,0,0.2)] overflow-hidden shrink-0 bg-white">
                      <img src={thumbnail} alt="대표사진" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setCropperState({
                            isOpen: true,
                            type: 'thumbnail',
                            imageSrc: thumbnail,
                            title: 'Photo 대표 촬영컷 자르기 & 비율 조절',
                            subtitle: '가운데 Photo 탭 최상단 대표 촬영 이미지',
                          });
                        }}
                        className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10.5px]"
                        title="대표사진 크롭 / 비율 조정"
                      >
                        <Crop size={16} />
                        <span className="mt-1">자르기</span>
                      </button>
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
              {/* 2. Photo 탭 최종 촬영 이미지 목록 (가운데 Photo 컬럼에 노출)    */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-normal text-black text-[12.5px]">
                    📸 <strong>Photo 탭 — 제품 최종 촬영 이미지 목록</strong> (가운데 Photo 탭에 나열될 스튜디오/공간 촬영컷)
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
                    <span>최종 촬영 이미지 추가 (여러 장 선택 가능)</span>
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
                        <span><strong>드래그 & 드롭</strong>으로 촬영컷 순서를 바꿀 수 있습니다.</span>
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

                            {/* Bottom Controls Bar on Hover */}
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

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCropperState({
                                      isOpen: true,
                                      type: 'detail-edit',
                                      imageSrc: imgSrc,
                                      title: `촬영컷 #${idx + 1} 자르기 & 비율 조절`,
                                      subtitle: '선택한 촬영 이미지의 구도 및 비율 재조정',
                                      detailEditIndex: idx,
                                    });
                                  }}
                                  className="text-white bg-black/70 hover:bg-black p-1 cursor-pointer transition-colors"
                                  title="이 사진 자르기 & 비율 조절"
                                >
                                  <Crop size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setThumbnail(imgSrc);
                                  }}
                                  className="text-[9.5px] bg-white text-black px-1.5 py-0.5 font-normal hover:bg-neutral-200 cursor-pointer transition-colors shadow-xs"
                                  title="이 사진을 대표 촬영컷으로 설정"
                                >
                                  대표로 지정
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[rgba(0,0,0,0.4)] py-1">
                    등록된 최종 촬영 이미지가 없습니다.
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* 3. More 탭 — CONTRIBUTION (기여도 % 조절 및 항목 설정)          */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-[rgba(0,0,0,0.2)] bg-[#FAFAFA] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[rgba(0,0,0,0.1)]">
                  <div>
                    <span className="font-medium text-black text-[13px]">
                      📊 More 탭 — CONTRIBUTION (기여도 % 설정)
                    </span>
                    <div className="text-[11px] text-[rgba(0,0,0,0.5)] mt-0.5">
                      우측 More 탭 스펙 하단에 표시되는 단계별 기여도 항목명과 퍼센트(0~100%)를 자유롭게 조절할 수 있습니다.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setContributionPhases((prev) => [
                        ...prev,
                        { label: '추가 단계 항목', percent: 100 },
                      ])
                    }
                    className="text-[11.5px] bg-black text-white px-2.5 py-1 flex items-center gap-1 hover:bg-neutral-800 cursor-pointer shrink-0"
                  >
                    <Plus size={11} />
                    <span>기여도 항목 추가</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {contributionPhases.map((phase, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-2.5 bg-white border border-[rgba(0,0,0,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      {/* 항목명 입력 */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                        <input
                          type="text"
                          value={phase.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContributionPhases((prev) => {
                              const copy = [...prev];
                              copy[pIdx] = { ...copy[pIdx], label: val };
                              return copy;
                            });
                          }}
                          placeholder="예: 기획 / 조형 디자인"
                          className="w-full border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px] focus:outline-none focus:border-black"
                        />
                      </div>

                      {/* 슬라이더 + 숫자 직접 입력 + 실시간 게이지 미리보기 */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={phase.percent}
                          onChange={(e) => {
                            const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setContributionPhases((prev) => {
                              const copy = [...prev];
                              copy[pIdx] = { ...copy[pIdx], percent: num };
                              return copy;
                            });
                          }}
                          className="w-24 sm:w-28 accent-black cursor-pointer"
                          title="드래그하여 기여도 % 조절"
                        />

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={phase.percent}
                            onChange={(e) => {
                              const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                              setContributionPhases((prev) => {
                                const copy = [...prev];
                                copy[pIdx] = { ...copy[pIdx], percent: num };
                                return copy;
                              });
                            }}
                            className="w-14 border border-[rgba(0,0,0,0.25)] px-1.5 py-1 text-[12.5px] font-mono text-right focus:outline-none focus:border-black"
                          />
                          <span className="text-[12px] font-mono text-black">%</span>
                        </div>

                        <div className="hidden md:block pl-1">
                          <ContributionLineGauge percent={phase.percent} />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setContributionPhases((prev) => prev.filter((_, i) => i !== pIdx))
                          }
                          className="text-red-600 hover:bg-red-50 p-1 cursor-pointer transition-colors"
                          title="이 기여도 항목 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {contributionPhases.length === 0 && (
                    <div className="text-[11.5px] text-[rgba(0,0,0,0.45)] py-1">
                      등록된 기여도 항목이 없습니다. 우측 상단 [기여도 항목 추가]를 눌러 추가하세요.
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================== */}
              {/* 4. More 탭 — 디벨롭 과정 블록 (대표/서브 이미지 + 우측 설명내용) */}
              {/* ============================================================== */}
              <div className="p-3.5 border border-black/30 bg-[#F7F7F5] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[rgba(0,0,0,0.12)]">
                  <div>
                    <span className="font-medium text-black text-[13px]">
                      🛠️ More 탭 — 디벨롭 과정 블록 편집 (상단 대표/좌측 서브 이미지 + 우측 설명내용)
                    </span>
                    <div className="text-[11px] text-[rgba(0,0,0,0.55)] mt-0.5">
                      각 블록의 1번 이미지(예: 1.1)가 상단 대표이미지로 먼저 보이며, 좌측 서브 썸네일(1.1, 1.2, 1.3...) 클릭 시 상단 이미지가 전환됩니다.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMoreBlocks((prev) => [
                        ...prev,
                        {
                          id: `block-${Date.now()}`,
                          title: `디벨롭 프로세스 0${prev.length + 1}`,
                          images: [],
                          description: '',
                        },
                      ])
                    }
                    className="text-[11.5px] bg-black text-white px-2.5 py-1.5 flex items-center gap-1 hover:bg-neutral-800 cursor-pointer shrink-0"
                  >
                    <Plus size={12} />
                    <span>+ 새 디벨롭 블록 추가</span>
                  </button>
                </div>

                {/* Hidden file input shared for block image uploads */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={blockFileInputRef}
                  onChange={handleBlockImageUpload}
                  className="hidden"
                />

                <div className="space-y-4">
                  {moreBlocks.map((block, bIdx) => {
                    const blockNum = bIdx + 1;
                    const blockImages = Array.isArray(block.images) ? block.images : [];
                    const urlInputVal = newBlockImageUrls[bIdx] || '';

                    return (
                      <div
                        key={block.id || bIdx}
                        className="p-3.5 bg-white border border-[rgba(0,0,0,0.18)] space-y-3"
                      >
                        {/* Block Header */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(0,0,0,0.08)]">
                          <span className="text-[12.5px] font-bold text-black font-mono">
                            BLOCK #{blockNum} ({blockNum}.1, {blockNum}.2, {blockNum}.3...)
                          </span>
                          <div className="flex items-center gap-2">
                            {moreBlocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMoreBlocks((prev) => prev.filter((_, i) => i !== bIdx))
                                }
                                className="text-[11px] text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 size={11} />
                                <span>블록 삭제</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 1. 블록 이미지 관리 (1.1 대표이미지, 1.2 서브이미지...) */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11.5px] font-medium text-black">
                              📷 블록 #{blockNum} 이미지 ({blockNum}.1 = 대표이미지, {blockNum}.2~ = 서브 썸네일)
                            </span>
                            <span className="text-[11px] font-mono text-[rgba(0,0,0,0.45)]">
                              총 {blockImages.length}장
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBlockUploadIdx(bIdx);
                                setTimeout(() => blockFileInputRef.current?.click(), 0);
                              }}
                              disabled={isCompressing}
                              className="text-[11.5px] border border-black bg-black text-white px-2.5 py-1 flex items-center gap-1.5 hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
                            >
                              {isCompressing ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Upload size={11} />
                              )}
                              <span>+ 사진 추가 (여러 장 가능)</span>
                            </button>

                            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
                              <input
                                type="text"
                                value={urlInputVal}
                                onChange={(e) =>
                                  setNewBlockImageUrls((prev) => ({
                                    ...prev,
                                    [bIdx]: e.target.value,
                                  }))
                                }
                                placeholder="이미지 URL 직접 추가"
                                className="flex-1 border border-[rgba(0,0,0,0.25)] px-2 py-1 text-[11.5px] bg-white focus:outline-none focus:border-black"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = urlInputVal.trim();
                                  if (!trimmed) return;
                                  setMoreBlocks((prev) => {
                                    const copy = [...prev];
                                    copy[bIdx] = {
                                      ...copy[bIdx],
                                      images: [...(copy[bIdx].images || []), trimmed],
                                    };
                                    return copy;
                                  });
                                  setNewBlockImageUrls((prev) => ({ ...prev, [bIdx]: '' }));
                                }}
                                className="text-[11.5px] border border-[rgba(0,0,0,0.3)] bg-neutral-50 px-2 py-1 hover:bg-neutral-100 cursor-pointer"
                              >
                                추가
                              </button>
                            </div>
                          </div>

                          {blockImages.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                              {blockImages.map((imgSrc, imgIdx) => {
                                const badgeLabel = `${blockNum}.${imgIdx + 1}`;
                                return (
                                  <div
                                    key={imgIdx}
                                    className="relative group bg-[#FAF9F6] border border-[rgba(0,0,0,0.2)] h-24 overflow-hidden"
                                  >
                                    <img
                                      src={imgSrc}
                                      alt={badgeLabel}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-1 left-1 bg-black/85 text-white text-[9.5px] px-1.5 py-0.5 font-mono">
                                      {badgeLabel} {imgIdx === 0 ? '(대표)' : ''}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMoreBlocks((prev) => {
                                          const copy = [...prev];
                                          copy[bIdx] = {
                                            ...copy[bIdx],
                                            images: copy[bIdx].images.filter((_, i) => i !== imgIdx),
                                          };
                                          return copy;
                                        });
                                      }}
                                      className="absolute top-1 right-1 bg-black/80 text-white p-0.5 hover:bg-red-600 transition-colors cursor-pointer"
                                      title="삭제"
                                    >
                                      <X size={10} />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          type="button"
                                          disabled={imgIdx === 0}
                                          onClick={() => {
                                            setMoreBlocks((prev) => {
                                              const copy = [...prev];
                                              const imgs = [...copy[bIdx].images];
                                              const [moved] = imgs.splice(imgIdx, 1);
                                              imgs.splice(imgIdx - 1, 0, moved);
                                              copy[bIdx] = { ...copy[bIdx], images: imgs };
                                              return copy;
                                            });
                                          }}
                                          className="text-white p-0.5 disabled:opacity-30 cursor-pointer"
                                          title="앞으로 이동"
                                        >
                                          <ChevronLeft size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={imgIdx === blockImages.length - 1}
                                          onClick={() => {
                                            setMoreBlocks((prev) => {
                                              const copy = [...prev];
                                              const imgs = [...copy[bIdx].images];
                                              const [moved] = imgs.splice(imgIdx, 1);
                                              imgs.splice(imgIdx + 1, 0, moved);
                                              copy[bIdx] = { ...copy[bIdx], images: imgs };
                                              return copy;
                                            });
                                          }}
                                          className="text-white p-0.5 disabled:opacity-30 cursor-pointer"
                                          title="뒤로 이동"
                                        >
                                          <ChevronRight size={11} />
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCropperState({
                                            isOpen: true,
                                            type: 'block-edit',
                                            blockIndex: bIdx,
                                            detailEditIndex: imgIdx,
                                            imageSrc: imgSrc,
                                            title: `${badgeLabel} 이미지 자르기`,
                                            subtitle: `More 블록 #${blockNum} 이미지 구도 조정`,
                                          });
                                        }}
                                        className="text-white p-0.5 cursor-pointer"
                                        title="자르기"
                                      >
                                        <Crop size={10} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[rgba(0,0,0,0.45)] py-1">
                              이 블록에 등록된 이미지가 없습니다. [+ 사진 추가] 버튼으로 대표(1.1) 및 서브(1.2, 1.3) 이미지를 등록하세요.
                            </div>
                          )}
                        </div>

                        {/* 2. 블록 우측 소제목 및 설명내용 입력 */}
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] text-[rgba(0,0,0,0.5)] mb-1">
                              우측 설명 소제목 (선택사항)
                            </label>
                            <input
                              type="text"
                              value={block.title || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMoreBlocks((prev) => {
                                  const copy = [...prev];
                                  copy[bIdx] = { ...copy[bIdx], title: val };
                                  return copy;
                                });
                              }}
                              placeholder="예: 프로젝트 개요 / 구조 설계 및 디테일"
                              className="w-full border border-[rgba(0,0,0,0.25)] px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-black"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-[rgba(0,0,0,0.5)] mb-1">
                              우측 상세 설명내용 (13px 본문으로 표시됨)
                            </label>
                            <textarea
                              rows={4}
                              value={block.description || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMoreBlocks((prev) => {
                                  const copy = [...prev];
                                  copy[bIdx] = { ...copy[bIdx], description: val };
                                  return copy;
                                });
                              }}
                              placeholder="우측에 표시될 디벨롭 과정 및 상세 설명을 입력하세요..."
                              className="w-full border border-[rgba(0,0,0,0.25)] p-2.5 text-[12.5px] leading-relaxed focus:outline-none focus:border-black"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div className="mx-5 mb-3 p-3 bg-neutral-900 text-white text-[12px] flex items-center justify-between shadow-lg">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-neutral-400 hover:text-white ml-3 text-[11px] underline cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* Discreet Data Sync & Transfer Bar (내보내기 / 불러오기) */}
        {isAuthenticated && (
          <div className="px-5 py-2.5 bg-neutral-50 border-t border-[rgba(0,0,0,0.1)] flex flex-wrap items-center justify-between text-[11px] text-[rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-1.5">
              <span>💡 깃허브 연동 또는 전체 백업:</span>
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
                className="underline hover:text-black cursor-pointer font-medium text-black font-semibold"
                title="다운로드된 custom-data.json을 깃허브 저장소에 업로드하시면 사이트에 즉시 반영됩니다"
              >
                [깃허브 연동용 custom-data.json 백업 다운로드]
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Crop & Aspect Ratio Modal */}
      {cropperState.isOpen && (
        <ImageCropperModal
          isOpen={cropperState.isOpen}
          imageSrc={cropperState.imageSrc}
          title={cropperState.title}
          subtitle={cropperState.subtitle}
          currentIndex={cropperState.queueIndex}
          totalCount={cropperState.queue?.length}
          onClose={() => setCropperState((prev) => ({ ...prev, isOpen: false }))}
          onCropComplete={handleCropComplete}
          onSkip={handleCropSkip}
        />
      )}
    </div>
  );
};
