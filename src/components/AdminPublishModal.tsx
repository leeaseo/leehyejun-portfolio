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
} from '../lib/content';
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
} from 'lucide-react';

interface AdminPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: (newProject: WorkProject) => void;
  onAboutUpdated: (newAbout: AboutData) => void;
  onResumeUpdated: (newResume: ResumeData) => void;
}

export const AdminPublishModal: React.FC<AdminPublishModalProps> = ({
  isOpen,
  onClose,
  onProjectAdded,
  onAboutUpdated,
  onResumeUpdated,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Main Section Tabs: 'work' | 'about' | 'resume'
  const [mainSection, setMainSection] = useState<'work' | 'about' | 'resume'>('work');

  // Work Sub-tab: 'editor' | 'list'
  const [workTab, setWorkTab] = useState<'editor' | 'list'>('editor');
  const [projectsList, setProjectsList] = useState<WorkProject[]>([]);
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
  const [aboutForm, setAboutForm] = useState<AboutData>(getAboutData());

  // Resume Form states
  const [resumeForm, setResumeForm] = useState<ResumeData>(getResumeData());

  const [isSaved, setIsSaved] = useState(false);

  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectsList(getAllProjects());
      setAboutForm(getAboutData());
      setResumeForm(getResumeData());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'leeaseo8626') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다.');
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
        const compressedBase64 = await compressImageFile(file, 1280, 1280, 0.84);
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
          const compressed = await compressImageFile(file, 1280, 1280, 0.82);
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

  const handleSelectProjectToEdit = (proj: WorkProject) => {
    setEditingSlug(proj.slug);
    setTitle(proj.title);
    setSlug(proj.slug);
    setDate(proj.date);
    setMaterials(proj.materials);
    setDimensions(proj.dimensions);
    setOrder(proj.order);
    setExternalUrl(proj.externalUrl || '');
    setContent(proj.content);
    setThumbnail(proj.thumbnail || '');
    setDetailImages(proj.images || []);
    setWorkTab('editor');
  };

  const handleNewProject = () => {
    setEditingSlug(null);
    setTitle('');
    setSlug('');
    setDate('2026');
    setMaterials('');
    setDimensions('');
    setOrder(projectsList.length + 1);
    setExternalUrl('');
    setContent('');
    setThumbnail('');
    setDetailImages([]);
    setWorkTab('editor');
  };

  const handleDeleteProject = (slugToDelete: string) => {
    if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
      deleteCustomProject(slugToDelete);
      const updated = getAllProjects();
      setProjectsList(updated);
      if (editingSlug === slugToDelete) {
        handleNewProject();
      }
    }
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

  const handlePublishWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('프로젝트명을 입력해주세요.');
      return;
    }

    const finalSlug = slug.trim() || editingSlug || `project-${Date.now()}`;

    const projectData: WorkProject = {
      title,
      slug: finalSlug,
      date,
      thumbnail: thumbnail || '',
      images: detailImages,
      materials: materials || 'Aluminum Extrusions, Hardware',
      dimensions: dimensions || 'Various Dimensions',
      externalUrl: externalUrl || undefined,
      order: Number(order) || 1,
      content: content || '프로젝트 상세 내용입니다.',
    };

    saveCustomProject(projectData);
    onProjectAdded(projectData);
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  // About Form Save Handler
  const handleSaveAbout = (e: React.FormEvent) => {
    e.preventDefault();
    saveAboutData(aboutForm);
    onAboutUpdated(aboutForm);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  // Resume Form Save Handler
  const handleSaveResume = (e: React.FormEvent) => {
    e.preventDefault();
    saveResumeData(resumeForm);
    onResumeUpdated(resumeForm);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col border border-black shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="h-11 px-4 sm:px-5 border-b border-[rgba(0,0,0,0.15)] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 text-[13px] font-normal text-black">
            {isAuthenticated ? <Unlock size={14} /> : <Lock size={14} />}
            <span>Admin Center (leehyejun)</span>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="flex items-center border border-[rgba(0,0,0,0.15)] text-[12px]">
                <button
                  type="button"
                  onClick={() => setMainSection('work')}
                  className={`px-3 py-1 flex items-center gap-1 ${mainSection === 'work' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}
                >
                  <Briefcase size={11} />
                  <span>Work</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainSection('about')}
                  className={`px-3 py-1 flex items-center gap-1 ${mainSection === 'about' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}
                >
                  <User size={11} />
                  <span>About</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainSection('resume')}
                  className={`px-3 py-1 flex items-center gap-1 ${mainSection === 'resume' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}
                >
                  <FileText size={11} />
                  <span>Resume</span>
                </button>
              </div>
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
                <span className="text-[11px] text-[rgba(0,0,0,0.45)]">저장 시 즉각 반영됩니다</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase mb-1 font-mono">
                    직함 (Role)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.role}
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
                    value={aboutForm.location}
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
                    value={aboutForm.name}
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
                    value={aboutForm.contact.email}
                    onChange={(e) =>
                      setAboutForm({
                        ...aboutForm,
                        contact: { ...aboutForm.contact, email: e.target.value },
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
                  value={aboutForm.bio}
                  onChange={(e) => setAboutForm({ ...aboutForm, bio: e.target.value })}
                  className="w-full border border-[rgba(0,0,0,0.25)] p-3 text-[13px] leading-relaxed focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(0,0,0,0.15)] flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-5 py-2 text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSaved ? <Check size={14} /> : null}
                  <span>{isSaved ? '저장 완료!' : 'About 변경 내용 저장'}</span>
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
                <span className="text-[11px] text-[rgba(0,0,0,0.45)]">저장 시 이력서에 즉각 반영</span>
              </div>

              {/* 1. 교육 */}
              <div className="space-y-2">
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                  1. 교육 (Education)
                </label>
                {resumeForm.education.map((edu, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="학교명"
                      value={edu.school}
                      onChange={(e) => {
                        const copy = [...resumeForm.education];
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
                        const copy = [...resumeForm.education];
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
                        const copy = [...resumeForm.education];
                        copy[idx].period = e.target.value;
                        setResumeForm({ ...resumeForm, education: copy });
                      }}
                      className="border border-[rgba(0,0,0,0.25)] px-2.5 py-1 text-[12.5px]"
                    />
                  </div>
                ))}
              </div>

              {/* 2. 경험 및 수상 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                    2. 경험 및 수상 (Honors & Projects)
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
                {(resumeForm.honors || []).map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
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
                      className="text-red-600 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 3. 자격 및 능력 */}
              <div className="space-y-2">
                <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                  3. 자격 및 소프트웨어 능력 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  placeholder="보유 스킬 (예: Auto CAD, Adobe softwares, Sketch Up, 3D MAX)"
                  value={resumeForm.skills.join(', ')}
                  onChange={(e) =>
                    setResumeForm({
                      ...resumeForm,
                      skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full border border-[rgba(0,0,0,0.25)] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>

              {/* 4. 경력 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-[rgba(0,0,0,0.5)] uppercase font-mono">
                    4. 경력 사항 (Experience)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...resumeForm.experience];
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

                {resumeForm.experience.map((exp, idx) => (
                  <div key={idx} className="p-3 border border-[rgba(0,0,0,0.15)] bg-[#FAFAFA] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[12px]">경력 #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const copy = resumeForm.experience.filter((_, i) => i !== idx);
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
                          const copy = [...resumeForm.experience];
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
                          const copy = [...resumeForm.experience];
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

              <div className="pt-3 border-t border-[rgba(0,0,0,0.15)] flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-5 py-2 text-[13px] font-normal hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSaved ? <Check size={14} /> : null}
                  <span>{isSaved ? '저장 완료!' : 'Resume 변경 내용 저장'}</span>
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
                {projectsList.map((p) => (
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
            </div>
          ) : (
            /* ============================================================== */
            /* 4. WORK PROJECT EDIT / CREATE FORM                            */
            /* ============================================================== */
            <form onSubmit={handlePublishWork} className="space-y-5">
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

                {/* Detail Images Grid Preview */}
                {detailImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {detailImages.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative group border border-[rgba(0,0,0,0.2)] bg-white h-24 overflow-hidden"
                      >
                        <img
                          src={imgSrc}
                          alt={`Detail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDetailImage(idx)}
                          className="absolute top-1 right-1 bg-black text-white p-1 rounded-xs hover:bg-red-600 transition-colors"
                          title="삭제"
                        >
                          <X size={11} />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
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
      </div>
    </div>
  );
};
