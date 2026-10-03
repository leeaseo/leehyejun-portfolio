import aboutJson from '../content/about.json';
import resumeJson from '../content/resume.json';
import customDataJson from '../content/custom-data.json';
import { AboutData, ResumeData, WorkProject, PostItem, PostAttachment } from './types';
import { idbGet, idbSet } from './idbStorage';
import { savePortfolioToFirestore } from './firebase';

// In-memory cache for full-fidelity projects (bypasses 5MB localStorage quota)
let memoryCustomProjects: WorkProject[] | null = null;

// Initialize from IndexedDB asynchronously on browser startup
if (typeof window !== 'undefined') {
  idbGet<WorkProject[]>('leehyejun_custom_projects').then((saved) => {
    if (Array.isArray(saved) && saved.length > 0) {
      memoryCustomProjects = saved;
    }
  }).catch(() => {});
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
          profileImage: parsed.profileImage || aboutJson.profileImage || '',
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

export async function syncToServer(data: { projects?: WorkProject[]; about?: AboutData; resume?: ResumeData }): Promise<void> {
  if (typeof window === 'undefined') return;
  // 1. Direct save to Google Cloud Firestore from client
  try {
    await savePortfolioToFirestore(data);
  } catch (err) {
    console.warn('[Firestore] Client sync error:', err);
  }
  // 2. Also sync to /api/publish
  try {
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('Sync to server warning:', err);
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
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_resume') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          totalExperience: parsed.totalExperience || ((customDataJson as any)?.resume?.totalExperience || (resumeJson as any).totalExperience || '총 5년 11개월'),
          education: Array.isArray(parsed.education) ? parsed.education : ((customDataJson as any)?.resume?.education || resumeJson.education || []),
          honors: Array.isArray(parsed.honors) ? parsed.honors : ((customDataJson as any)?.resume?.honors || resumeJson.honors || []),
          skills: Array.isArray(parsed.skills) ? parsed.skills : ((customDataJson as any)?.resume?.skills || resumeJson.skills || []),
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : ((customDataJson as any)?.resume?.certifications || resumeJson.certifications || []),
          experience: Array.isArray(parsed.experience) ? parsed.experience : ((customDataJson as any)?.resume?.experience || resumeJson.experience || []),
          resumePdf: parsed.resumePdf || (customDataJson as any)?.resume?.resumePdf || resumeJson.resumePdf || '',
        };
      }
    }
  } catch {
    // fallback
  }
  if ((customDataJson as any)?.resume) {
    return (customDataJson as any).resume as ResumeData;
  }
  return resumeJson as ResumeData;
}

export function saveResumeData(data: ResumeData): void {
  try {
    localStorage.setItem('leehyejun_custom_resume', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save resume data:', err);
  }
  syncToServer({ resume: data });
}

export function getCustomProjects(): WorkProject[] {
  // 1. Check in-memory cache first (preserves original high-res photos)
  if (memoryCustomProjects && memoryCustomProjects.length > 0) {
    return memoryCustomProjects;
  }

  // 2. Check localStorage
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_projects') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCustomProjects = parsed;
        return parsed;
      }
    }
  } catch {}

  // 3. Fallback to bundled custom-data.json
  if ((customDataJson as any)?.projects && Array.isArray((customDataJson as any).projects)) {
    return (customDataJson as any).projects;
  }
  return [];
}

export function saveCustomProject(project: WorkProject, originalSlug?: string): void {
  const existing = getCustomProjects();
  const targetSlug = originalSlug || project.slug;

  let replaced = false;
  // Replace in place: matching by originalSlug, slug, or exact order slot
  const updated = existing.map((p) => {
    if (p.slug === targetSlug || p.slug === project.slug || p.order === project.order) {
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
  const projects: WorkProject[] = [];

  for (const [path, rawContent] of Object.entries(workModules)) {
    const { frontmatter, content } = parseFrontmatter<Partial<WorkProject>>(rawContent);
    const slugFromPath = path.split('/').pop()?.replace('.mdx', '') || '';

    projects.push({
      title: frontmatter.title || 'Untitled Project',
      slug: frontmatter.slug || slugFromPath,
      date: frontmatter.date || '2025',
      thumbnail: frontmatter.thumbnail || '',
      images: frontmatter.images || [],
      materials: frontmatter.materials || 'Aluminum, Steel',
      dimensions: frontmatter.dimensions || 'Various Dimensions',
      externalUrl: frontmatter.externalUrl,
      order: typeof frontmatter.order === 'number' ? frontmatter.order : 99,
      content: content,
    });
  }

  // Merge custom owner-published projects (matches either by slug, order slot, or title)
  const custom = getCustomProjects();
  if (Array.isArray(custom)) {
    for (const cp of custom) {
      if (!cp || !cp.slug) continue;
      const existingIdx = projects.findIndex(
        (p) =>
          p &&
          (p.slug === cp.slug ||
            p.order === cp.order ||
            (p.title && cp.title && p.title.trim().toLowerCase() === cp.title.trim().toLowerCase()))
      );
      if (existingIdx !== -1) {
        projects[existingIdx] = cp;
      } else {
        projects.push(cp);
      }
    }
  }

  return projects
    .filter((p): p is WorkProject => Boolean(p && p.slug))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

export function getProjectBySlug(slug: string): WorkProject | undefined {
  const all = getAllProjects();
  return all.find((p) => p.slug === slug);
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
