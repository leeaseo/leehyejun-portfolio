import aboutJson from '../content/about.json';
import resumeJson from '../content/resume.json';
import { AboutData, ResumeData, WorkProject, PostItem, PostAttachment } from './types';

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
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return aboutJson as AboutData;
}

export function saveAboutData(data: AboutData): void {
  try {
    localStorage.setItem('leehyejun_custom_about', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save about data:', err);
  }
}

export function getResumeData(): ResumeData {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_resume') : null;
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return resumeJson as ResumeData;
}

export function saveResumeData(data: ResumeData): void {
  try {
    localStorage.setItem('leehyejun_custom_resume', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save resume data:', err);
  }
}

export function getCustomProjects(): WorkProject[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leehyejun_custom_projects') : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomProject(project: WorkProject): void {
  const existing = getCustomProjects();
  const updated = existing.filter((p) => p.slug !== project.slug);
  updated.push(project);
  try {
    localStorage.setItem('leehyejun_custom_projects', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
    alert('이미지 용량이 너무 커서 브라우저 저장소 용량이 초과되었습니다. 이미지를 압축하여 저장합니다.');
  }
}

export function deleteCustomProject(slug: string): void {
  const existing = getCustomProjects();
  const updated = existing.filter((p) => p.slug !== slug);
  try {
    localStorage.setItem('leehyejun_custom_projects', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update projects:', err);
  }
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

  // Merge custom owner-published projects
  const custom = getCustomProjects();
  for (const cp of custom) {
    const existingIdx = projects.findIndex((p) => p.slug === cp.slug);
    if (existingIdx !== -1) {
      projects[existingIdx] = cp;
    } else {
      projects.push(cp);
    }
  }

  return projects.sort((a, b) => a.order - b.order);
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
