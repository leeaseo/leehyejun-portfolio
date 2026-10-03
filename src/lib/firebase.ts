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

export async function fetchPortfolioFromFirestore(): Promise<{
  projects?: WorkProject[];
  about?: any;
  resume?: any;
} | null> {
  try {
    // 1. Fetch individual project documents from /projects
    const projectsCol = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsCol);
    let projects: WorkProject[] = [];

    if (!projectsSnap.empty) {
      projectsSnap.forEach((d) => {
        const pData = d.data() as WorkProject;
        if (pData && pData.slug) {
          projects.push(pData);
        }
      });
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

    if (projects.length > 0 || contentData?.about || contentData?.resume) {
      return {
        projects: projects.length > 0 ? projects : undefined,
        about: contentData?.about,
        resume: contentData?.resume,
      };
    }
  } catch (err) {
    console.warn('[Firestore] Failed to read portfolio:', err);
  }
  return null;
}

export async function savePortfolioToFirestore(data: {
  projects?: WorkProject[];
  about?: any;
  resume?: any;
}): Promise<boolean> {
  try {
    // 1. Save individual projects to /projects/{slug} collection (each doc gets its own 1MB budget!)
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      for (const proj of data.projects) {
        if (!proj.slug) continue;
        const projRef = doc(db, 'projects', proj.slug);
        await setDoc(projRef, {
          ...proj,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Save global metadata to /content/portfolio
    const contentRef = doc(db, 'content', 'portfolio');
    const metaPayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.about) metaPayload.about = data.about;
    if (data.resume) metaPayload.resume = data.resume;
    if (data.projects) {
      metaPayload.projectManifest = data.projects.map((p) => ({
        slug: p.slug,
        title: p.title,
        order: p.order,
      }));
    }

    await setDoc(contentRef, metaPayload, { merge: true });
    console.log('[Firestore] Successfully saved projects & content to Cloud Firestore!');
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
