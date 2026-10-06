import aboutJson from '../content/about.json';
import resumeJson from '../content/resume.json';
import customDataJson from '../content/custom-data.json';
import { AboutData, ResumeData, WorkProject, PostItem, PostAttachment } from './types';
import { idbGet, idbSet } from './idbStorage';
import { savePortfolioToFirestore } from './firebase';
import { DEFAULT_EXPERIENCE_PROJECTS } from './experienceData';

// In-memory cache for full-fidelity projects (bypasses 5MB localStorage quota)
let memoryCustomProjects: WorkProject[] | null = null;
let memoryExperienceProjects: WorkProject[] | null = null;

// Primary initialization from bundled custom-data.json (Git repository source of truth)
if ((customDataJson as any)?.projects && Array.isArray((customDataJson as any).projects)) {
  memoryCustomProjects = (customDataJson as any).projects;
}
if ((customDataJson as any)?.experiences && Array.isArray((customDataJson as any).experiences)) {
  memoryExperienceProjects = (customDataJson as any).experiences;
}

// Load MDX raw strings at build/bundle time via Vite eager glob
const workModules = import.meta.glob('../content/work/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const moreModules = import.meta.glob('../content/more/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

interface ParsedMdx<T> {
  frontmatter: T;
  content: string;
}

/**
 * Robust frontmatter parser without requiring bulky Node polyfills.
 */
function parseFrontmatter<T>(rawString: string): ParsedMdx<T> {
  const match = rawString.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {} as T, content: rawString.trim() };
  }

  const rawYaml = match[1];
  const content = match[2].trim();
  const frontmatter: Record<string, any> = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = '';
  let isList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if line is a list item under previous key
    if (trimmed.startsWith('- ') && currentKey) {
      const itemVal = trimmed.replace(/^- \s*/, '').replace(/^["']|["']$/g, '');
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      
      // Check if attachment object or simple string
      if (itemVal.startsWith('name:')) {
        // will be processed below
      } else {
        frontmatter[currentKey].push(itemVal);
      }
      continue;
    }

    // Check key: value
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (val === '') {
        // Could be start of list or subobject
        currentKey = key;
        frontmatter[currentKey] = [];
        isList = true;
      } else {
        currentKey = key;
        isList = false;
        // Strip quotes
        let cleanVal: any = val.replace(/^["']|["']$/g, '');
        if (/^\d+$/.test(cleanVal)) {
          cleanVal = parseInt(cleanVal, 10);
        }
        frontmatter[key] = cleanVal;
      }
    }
  }

  // Handle attachments in More MDX
  if (rawYaml.includes('attachments:')) {
    const attachmentMatches: PostAttachment[] = [];
    const attBlock = rawYaml.split('attachments:')[1];
    if (attBlock) {
      const items = attBlock.split(/- name:/g).filter(Boolean);
      for (const item of items) {
        const nameMatch = item.match(/^\s*["']?([^"\n\r]+)["']?/);
        const pathMatch = item.match(/path:\s*["']?([^"\n\r]+)["']?/);
        const sizeMatch = item.match(/size:\s*["']?([^"\n\r]+)["']?/);
        if (nameMatch && pathMatch) {
          attachmentMatches.push({
            name: nameMatch[1].trim(),
            path: pathMatch[1].trim(),
            size: sizeMatch ? sizeMatch[1].trim() : undefined,
          });
        }
      }
      if (attachmentMatches.length > 0) {
        frontmatter['attachments'] = attachmentMatches;
      }
    }
  }

  // Handle images in Work MDX
  if (rawYaml.includes('images:')) {
    const imgMatches: string[] = [];
    const imgBlock = rawYaml.split('images:')[1]?.split(/^[a-zA-Z0-9_-]+:/m)[0];
    if (imgBlock) {
      const lines = imgBlock.split(/\r?\n/);
      for (const l of lines) {
        const m = l.match(/^\s*-\s*["']?([^"'\n\r]+)["']?/);
        if (m) {
          imgMatches.push(m[1].trim());
        }
      }
      if (imgMatches.length > 0) {
        frontmatter['images'] = imgMatches;
      }
    }
  }

  return { frontmatter: frontmatter as T, content };
}

export function getAboutData(): AboutData {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_about') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          name: parsed.name || aboutJson.name || 'Lee Hye Jun',
          role: parsed.role || aboutJson.role || 'Furniture Designer',
          location: parsed.location || aboutJson.location || 'Seoul, Korea',
          bio: parsed.bio || aboutJson.bio || '',
          profileImage: parsed.profileImage || (aboutJson as any).profileImage || '',
          contact: {
            email: parsed.contact?.email || parsed.email || aboutJson.contact?.email || '15682@naver.com',
            instagram: parsed.contact?.instagram || aboutJson.contact?.instagram || '',
            linkedin: parsed.contact?.linkedin || aboutJson.contact?.linkedin || '',
            github: parsed.contact?.github || aboutJson.contact?.github || '',
          },
        };
      }
    }
  } catch {
    // fallback
  }
  if ((customDataJson as any)?.about) {
    return (customDataJson as any).about as AboutData;
  }
  return aboutJson as AboutData;
}

export async function syncToServer(data: {
  projects?: WorkProject[];
  experiences?: WorkProject[];
  about?: AboutData;
  resume?: ResumeData;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  // 1. Primary: Save immediately to server disk via /api/publish
  try {
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('Sync to server warning:', err);
  }
  // 2. Secondary: Fire and forget Firestore save without blocking
  try {
    savePortfolioToFirestore(data).catch(() => {});
  } catch (err) {
    console.warn('[Firestore] Client sync error:', err);
  }
}

export function saveAboutData(data: AboutData): void {
  try {
    localStorage.setItem('leehyejun_custom_about', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save about data:', err);
  }
  syncToServer({ about: data });
}

export function getResumeData(): ResumeData {
  const defaultHonors = (customDataJson as any)?.resume?.honors || resumeJson.honors || [
    { title: "Poing — ASIA DESIGN PRIZE 2021 'GOLD WINNER'", period: "2021년" },
    { title: "Librat — MIICON 콘크리트 가구 공모전 '장려상'", period: "2019년" },
    { title: "Como Desk — 고지베리 목공방 개인프로젝트", period: "2020-21년" }
  ];

  if ((customDataJson as any)?.resume) {
    return {
      ...((customDataJson as any).resume as ResumeData),
      honors: defaultHonors,
    };
  }

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_resume') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          totalExperience:
            (parsed.totalExperience === '총 5년 11개월' ? '총 6년 2개월' : parsed.totalExperience) ||
            ((resumeJson as any).totalExperience || '총 6년 2개월'),
          education: Array.isArray(parsed.education) ? parsed.education : (resumeJson.education || []),
          honors: defaultHonors,
          skills: Array.isArray(parsed.skills) ? parsed.skills : (resumeJson.skills || []),
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : (resumeJson.certifications || []),
          experience: Array.isArray(parsed.experience) ? parsed.experience : (resumeJson.experience || []),
          resumePdf: parsed.resumePdf || resumeJson.resumePdf || '',
        };
      }
    }
  } catch {
    // fallback
  }
  return {
    ...(resumeJson as ResumeData),
    honors: defaultHonors,
  };
}

export function saveResumeData(data: ResumeData): void {
  try {
    localStorage.setItem('leehyejun_custom_resume', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save resume data:', err);
  }
  syncToServer({ resume: data });
}

export function isExperienceSlug(slug?: string): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  return (
    s.includes('poing') ||
    s.includes('como-desk') ||
    s.includes('como_desk') ||
    s.includes('librat') ||
    s.includes('convenset')
  );
}

export function getCustomProjects(): WorkProject[] {
  let list: WorkProject[] = [];
  // 1. Check in-memory cache first
  if (memoryCustomProjects && memoryCustomProjects.length > 0) {
    list = memoryCustomProjects;
  } else {
    // 2. Primary: Bundled custom-data.json (Git repository source of truth)
    if ((customDataJson as any)?.projects && Array.isArray((customDataJson as any).projects) && (customDataJson as any).projects.length > 0) {
      list = (customDataJson as any).projects;
      memoryCustomProjects = list;
    } else {
      // 3. Fallback: localStorage
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_projects') : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryCustomProjects = parsed;
            list = parsed;
          }
        }
      } catch {}
    }
  }

  // Strictly filter out any experience projects (order >= 100 or experience slugs)
  return list.filter((p) => p && !isExperienceSlug(p.slug) && (!p.order || p.order < 100));
}

export function saveCustomProject(project: WorkProject, originalSlug?: string): void {
  const existing = getCustomProjects();
  const targetSlug = originalSlug || project.slug;

  let replaced = false;
  // Replace in place: matching strictly by slug
  const updated = existing.map((p) => {
    if (p.slug === targetSlug || p.slug === project.slug) {
      replaced = true;
      return project;
    }
    return p;
  });

  if (!replaced) {
    updated.push(project);
  }

  // Always keep projects strictly sorted by the explicit order number
  updated.sort((a, b) => (a.order || 99) - (b.order || 99));

  // 1. Update in-memory cache immediately
  memoryCustomProjects = updated;

  // 2. Asynchronously save to IndexedDB (unlimited storage, no 5MB quota errors!)
  if (typeof window !== 'undefined') {
    idbSet('leehyejun_custom_projects', updated).catch(() => {});
  }

  // 3. Attempt to save to localStorage safely
  try {
    localStorage.setItem('leehyejun_custom_projects', JSON.stringify(updated));
  } catch (err) {
    console.warn('[Storage] LocalStorage quota reached, project preserved in IndexedDB & Memory:', err);
  }

  // 4. Sync full dataset to server
  const allMerged = getAllProjects();
  syncToServer({ projects: allMerged });
}

export function deleteCustomProject(slug: string): void {
  const existing = getCustomProjects();
  const updated = existing.filter((p) => p.slug !== slug);
  memoryCustomProjects = updated;

  if (typeof window !== 'undefined') {
    idbSet('leehyejun_custom_projects', updated).catch(() => {});
  }

  try {
    localStorage.setItem('leehyejun_custom_projects', JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
  syncToServer({ projects: getAllProjects() });
}

export function getAllProjects(): WorkProject[] {
  // 1. Primary: Bundled and custom projects list
  const custom = getCustomProjects();
  if (Array.isArray(custom) && custom.length > 0) {
    return custom
      .filter((p): p is WorkProject => Boolean(p && p.slug && !isExperienceSlug(p.slug) && (!p.order || p.order < 100)))
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  // 2. Fallback: Seed with bundled MDX files only if no custom-data exists
  const projectsMap = new Map<string, WorkProject>();
  for (const [path, rawContent] of Object.entries(workModules)) {
    const { frontmatter, content } = parseFrontmatter<Partial<WorkProject>>(rawContent);
    const slugFromPath = path.split('/').pop()?.replace('.mdx', '') || '';
    const slug = frontmatter.slug || slugFromPath;
    if (slug) {
      projectsMap.set(slug, {
        title: frontmatter.title || 'Untitled Project',
        slug,
        date: frontmatter.date || '2026',
        thumbnail: frontmatter.thumbnail || '',
        images: frontmatter.images || [],
        materials: frontmatter.materials || 'Aluminum, Steel',
        dimensions: frontmatter.dimensions || 'Various Dimensions',
        externalUrl: frontmatter.externalUrl,
        order: typeof frontmatter.order === 'number' ? frontmatter.order : 99,
        content: content,
      });
    }
  }

  const list = Array.from(projectsMap.values());
  return list
    .filter((p): p is WorkProject => Boolean(p && p.slug && !isExperienceSlug(p.slug) && (!p.order || p.order < 100)))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

export function getExperienceProjects(): WorkProject[] {
  if (memoryExperienceProjects && memoryExperienceProjects.length > 0) {
    return memoryExperienceProjects;
  }
  let list = [...DEFAULT_EXPERIENCE_PROJECTS];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_experiences') : null;
    let parsed: any[] | null = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {}
    }

    // Merge both customDataJson.experiences and customDataJson.projects to guarantee photos are never missed
    const allCustom = [
      ...((customDataJson as any)?.experiences || []),
      ...((customDataJson as any)?.projects || []),
    ];

    list = list.map((exp) => {
      const fromLocal = parsed?.find((p: any) => p && p.slug === exp.slug);
      const fromCustom = allCustom.find((p: any) => p && p.slug === exp.slug);
      const match = fromLocal || fromCustom;
      if (!match) return exp;

      const localImages = Array.isArray(fromLocal?.images) ? fromLocal.images : [];
      const customImages = Array.isArray(fromCustom?.images) ? fromCustom.images : [];
      const resolvedImages =
        customImages.length > 0
          ? customImages
          : localImages.length > 0
          ? localImages
          : exp.images;

      return {
        ...exp,
        title: match.title || exp.title,
        date: match.date || exp.date,
        materials: match.materials !== undefined ? match.materials : exp.materials,
        dimensions: match.dimensions !== undefined ? match.dimensions : exp.dimensions,
        content: match.content !== undefined ? match.content : exp.content,
        images: resolvedImages,
        thumbnail: match.thumbnail || resolvedImages[0] || exp.thumbnail,
        externalUrl: match.externalUrl || exp.externalUrl,
      };
    });
  } catch (err) {
    console.warn('getExperienceProjects error:', err);
  }
  return list;
}

export function saveExperienceProject(project: WorkProject): void {
  const current = getExperienceProjects();
  let found = false;
  const updated = current.map((p) => {
    if (p.slug === project.slug) {
      found = true;
      return project;
    }
    return p;
  });
  if (!found) {
    updated.push(project);
  }
  memoryExperienceProjects = updated;

  if (typeof window !== 'undefined') {
    idbSet('leehyejun_custom_experiences', updated).catch(() => {});
  }

  try {
    localStorage.setItem('leehyejun_custom_experiences', JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage error on experience project save:', err);
  }
  syncToServer({ experiences: updated });
}

export function saveAllProjectsBatch(projects: WorkProject[], experiences: WorkProject[]): void {
  memoryCustomProjects = projects;
  memoryExperienceProjects = experiences;
  if (typeof window !== 'undefined') {
    idbSet('leehyejun_custom_projects', projects).catch(() => {});
    idbSet('leehyejun_custom_experiences', experiences).catch(() => {});
    try {
      localStorage.setItem('leehyejun_custom_projects', JSON.stringify(projects));
      localStorage.setItem('leehyejun_custom_experiences', JSON.stringify(experiences));
    } catch {}
  }
  syncToServer({ projects, experiences });
}

export function getProjectBySlug(slug: string): WorkProject | undefined {
  const all = getAllProjects();
  const found = all.find((p) => p.slug === slug);
  if (found) return found;

  const experiences = getExperienceProjects();
  return experiences.find((p) => p.slug === slug);
}

export function getAllPosts(): PostItem[] {
  const posts: PostItem[] = [];

  for (const [path, rawContent] of Object.entries(moreModules)) {
    const { frontmatter, content } = parseFrontmatter<Partial<PostItem>>(rawContent);
    const slugFromPath = path.split('/').pop()?.replace('.mdx', '') || '';

    posts.push({
      title: frontmatter.title || 'Untitled Post',
      slug: frontmatter.slug || slugFromPath,
      date: frontmatter.date || '2025-01-01',
      category: frontmatter.category || 'essay',
      excerpt: frontmatter.excerpt || '',
      attachments: frontmatter.attachments || [],
      content: content,
    });
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): PostItem | undefined {
  const all = getAllPosts();
  return all.find((p) => p.slug === slug);
}
