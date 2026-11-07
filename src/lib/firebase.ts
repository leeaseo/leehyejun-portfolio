import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkProject } from './types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

const FS_IMG_PREFIX = '__fs_img__:';

function hashBase64Id(slug: string, dataUrl: string): string {
  let h1 = 0xdeadbeef ^ dataUrl.length;
  let h2 = 0x41c6ce57 ^ dataUrl.length;
  const step = Math.max(1, Math.floor(dataUrl.length / 512));
  for (let i = 0; i < dataUrl.length; i += step) {
    const ch = dataUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  const safeSlug = (slug || 'proj').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  return `${safeSlug}_${hex}_${dataUrl.length}`;
}

async function offloadBase64Image(slug: string, imgStr: string): Promise<string> {
  if (!imgStr || typeof imgStr !== 'string' || !imgStr.startsWith('data:image/')) {
    return imgStr;
  }
  const imgId = hashBase64Id(slug, imgStr);
  try {
    const imgRef = doc(db, 'images', imgId);
    // Split into chunks of 700,000 chars so even multi-MB base64 strings never exceed Firestore's 1MB limit
    const CHUNK_SIZE = 700000;
    if (imgStr.length <= CHUNK_SIZE) {
      await setDoc(imgRef, {
        slug,
        dataUrl: imgStr,
        chunkCount: 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < imgStr.length; i += CHUNK_SIZE) {
        chunks.push(imgStr.slice(i, i + CHUNK_SIZE));
      }
      await setDoc(imgRef, {
        slug,
        chunkCount: chunks.length,
        updatedAt: new Date().toISOString(),
      });
      for (let c = 0; c < chunks.length; c++) {
        await setDoc(doc(db, 'images', `${imgId}_part_${c}`), {
          part: c,
          data: chunks[c],
        });
      }
    }
    return `${FS_IMG_PREFIX}${imgId}`;
  } catch (err) {
    console.warn('[Firestore] Failed to offload image:', imgId, err);
    return imgStr;
  }
}

async function resolveOffloadedImage(
  imgStr: string,
  imageCache: Map<string, string>
): Promise<string> {
  if (!imgStr || typeof imgStr !== 'string' || !imgStr.startsWith(FS_IMG_PREFIX)) {
    return imgStr;
  }
  const imgId = imgStr.slice(FS_IMG_PREFIX.length);
  if (imageCache.has(imgId)) {
    return imageCache.get(imgId)!;
  }
  try {
    const snap = await getDoc(doc(db, 'images', imgId));
    if (!snap.exists()) return imgStr;
    const data = snap.data();
    if (data.dataUrl) {
      imageCache.set(imgId, data.dataUrl);
      return data.dataUrl;
    }
    if (typeof data.chunkCount === 'number' && data.chunkCount > 1) {
      const parts: string[] = [];
      for (let c = 0; c < data.chunkCount; c++) {
        const pSnap = await getDoc(doc(db, 'images', `${imgId}_part_${c}`));
        if (pSnap.exists()) {
          parts.push(pSnap.data().data || '');
        }
      }
      const joined = parts.join('');
      if (joined) {
        imageCache.set(imgId, joined);
        return joined;
      }
    }
  } catch (err) {
    console.warn('[Firestore] Failed to resolve image:', imgId, err);
  }
  return imgStr;
}

export async function fetchPortfolioFromFirestore(): Promise<{
  projects?: WorkProject[];
  about?: any;
  resume?: any;
  updatedAt?: string;
  exportedAt?: string;
} | null> {
  try {
    // 1. Fetch individual project documents from /projects
    const projectsCol = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsCol);
    let projects: WorkProject[] = [];
    const imageCache = new Map<string, string>();

    if (!projectsSnap.empty) {
      const rawProjects: WorkProject[] = [];
      projectsSnap.forEach((d) => {
        const pData = d.data() as WorkProject;
        if (pData && pData.slug) {
          rawProjects.push(pData);
        }
      });

      for (const pData of rawProjects) {
        const resolvedProj = { ...pData };
        if (resolvedProj.thumbnail) {
          resolvedProj.thumbnail = await resolveOffloadedImage(resolvedProj.thumbnail, imageCache);
        }
        if (Array.isArray(resolvedProj.images)) {
          resolvedProj.images = await Promise.all(
            resolvedProj.images.map((img) => resolveOffloadedImage(img, imageCache))
          );
        }
        if (Array.isArray(resolvedProj.processImages)) {
          resolvedProj.processImages = await Promise.all(
            resolvedProj.processImages.map((img) => resolveOffloadedImage(img, imageCache))
          );
        }
        if (Array.isArray(resolvedProj.moreBlocks)) {
          resolvedProj.moreBlocks = await Promise.all(
            resolvedProj.moreBlocks.map(async (b) => ({
              ...b,
              images: Array.isArray(b.images)
                ? await Promise.all(b.images.map((img) => resolveOffloadedImage(img, imageCache)))
                : [],
            }))
          );
        }
        projects.push(resolvedProj);
      }

      // Sort strictly by order
      projects.sort((a, b) => (a.order || 99) - (b.order || 99));
    }

    // 2. Fetch global metadata (about, resume)
    const contentRef = doc(db, 'content', 'portfolio');
    const contentSnap = await getDoc(contentRef);
    const contentData = contentSnap.exists() ? contentSnap.data() : null;

    if (projects.length === 0 && contentData?.projects && Array.isArray(contentData.projects)) {
      projects = contentData.projects;
    }

    // Determine newest updatedAt across both content/portfolio and individual project docs
    let latestUpdatedAt = contentData?.updatedAt || contentData?.exportedAt || '';
    for (const p of projects as any[]) {
      if (p.updatedAt && (!latestUpdatedAt || p.updatedAt > latestUpdatedAt)) {
        latestUpdatedAt = p.updatedAt;
      }
    }

    if (projects.length > 0 || contentData?.about || contentData?.resume) {
      return {
        projects: projects.length > 0 ? projects : undefined,
        about: contentData?.about,
        resume: contentData?.resume,
        updatedAt: latestUpdatedAt || contentData?.updatedAt,
        exportedAt: latestUpdatedAt || contentData?.exportedAt || contentData?.updatedAt,
      };
    }
  } catch (err) {
    console.warn('[Firestore] Failed to read portfolio:', err);
  }
  return null;
}

export async function savePortfolioToFirestore(data: {
  projects?: WorkProject[];
  experiences?: WorkProject[];
  about?: any;
  resume?: any;
}): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    // 1. Save individual projects to /projects/{slug} collection, offloading any base64 images to /project_images
    const allProjs = [...(data.projects || []), ...(data.experiences || [])];
    if (allProjs.length > 0) {
      for (const proj of allProjs) {
        if (!proj.slug) continue;
        try {
          const slug = proj.slug;
          const lightProj: WorkProject = { ...proj };

          if (lightProj.thumbnail && lightProj.thumbnail.startsWith('data:image/')) {
            lightProj.thumbnail = await offloadBase64Image(slug, lightProj.thumbnail);
          }
          if (Array.isArray(lightProj.images)) {
            lightProj.images = await Promise.all(
              lightProj.images.map((img) => offloadBase64Image(slug, img))
            );
          }
          if (Array.isArray(lightProj.processImages)) {
            lightProj.processImages = await Promise.all(
              lightProj.processImages.map((img) => offloadBase64Image(slug, img))
            );
          }
          if (Array.isArray(lightProj.moreBlocks)) {
            lightProj.moreBlocks = await Promise.all(
              lightProj.moreBlocks.map(async (b) => ({
                ...b,
                images: Array.isArray(b.images)
                  ? await Promise.all(b.images.map((img) => offloadBase64Image(slug, img)))
                  : [],
              }))
            );
          }

          // Strip any undefined fields that Firestore rejects
          const cleanDoc = JSON.parse(
            JSON.stringify({
              ...lightProj,
              updatedAt: nowIso,
            })
          );

          const projRef = doc(db, 'projects', slug);
          await setDoc(projRef, cleanDoc);
        } catch (projErr) {
          console.error(`[Firestore] Failed to save project ${proj.slug}:`, projErr);
        }
      }
    }

    // 2. Save global metadata to /content/portfolio
    const contentRef = doc(db, 'content', 'portfolio');
    const metaPayload: Record<string, any> = {
      updatedAt: nowIso,
      exportedAt: nowIso,
    };
    if (data.about) metaPayload.about = JSON.parse(JSON.stringify(data.about));
    if (data.resume) metaPayload.resume = JSON.parse(JSON.stringify(data.resume));
    if (data.projects) {
      metaPayload.projectManifest = data.projects.map((p) => ({
        slug: p.slug,
        title: p.title,
        order: p.order,
      }));
    }

    await setDoc(contentRef, metaPayload, { merge: true });
    console.log('[Firestore] Successfully saved projects & offloaded images to Cloud Firestore!');
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to save portfolio:', err);
    return false;
  }
}

export async function deleteProjectFromFirestore(slug: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', slug);
    await deleteDoc(projRef);
    console.log('[Firestore] Successfully deleted project from Cloud Firestore:', slug);
  } catch (err) {
    console.warn('[Firestore] Delete error:', err);
  }
}
