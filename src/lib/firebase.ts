import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkProject, AboutData, ResumeData } from './types';
import aboutJson from '../content/about.json';
import resumeJson from '../content/resume.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot
(async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, check connection.');
    }
  }
})();

const PROJECTS_COLLECTION = 'projects';
const SITE_CONTENT_COLLECTION = 'site_content';

/**
 * Sanitize and guarantee all fields of AboutData exist
 */
export function sanitizeAboutData(data?: Partial<AboutData> | null): AboutData {
  if (!data || typeof data !== 'object') return aboutJson as AboutData;
  return {
    name: data.name || aboutJson.name || 'Lee Hye Jun',
    role: data.role || aboutJson.role || 'Furniture Designer',
    location: data.location || aboutJson.location || 'Seoul, Korea',
    bio: data.bio || aboutJson.bio || '',
    profileImage: data.profileImage || aboutJson.profileImage || '',
    contact: {
      email: data.contact?.email || (data as unknown as { email?: string })?.email || aboutJson.contact?.email || '15682@naver.com',
      instagram: data.contact?.instagram || aboutJson.contact?.instagram || '',
      linkedin: data.contact?.linkedin || aboutJson.contact?.linkedin || '',
      github: data.contact?.github || aboutJson.contact?.github || '',
    },
  };
}

/**
 * Sanitize and guarantee all fields of ResumeData exist
 */
export function sanitizeResumeData(data?: Partial<ResumeData> | null): ResumeData {
  if (!data || typeof data !== 'object') return resumeJson as ResumeData;
  return {
    education: Array.isArray(data.education) ? data.education : (resumeJson.education || []),
    honors: Array.isArray(data.honors) ? data.honors : (resumeJson.honors || []),
    skills: Array.isArray(data.skills) ? data.skills : (resumeJson.skills || []),
    certifications: Array.isArray(data.certifications) ? data.certifications : (resumeJson.certifications || []),
    experience: Array.isArray(data.experience) ? data.experience : (resumeJson.experience || []),
    resumePdf: data.resumePdf || resumeJson.resumePdf || '',
  };
}

/**
 * Save single project to Firestore
 */
export async function saveProjectToCloud(project: WorkProject): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, project.slug);
  await setDoc(docRef, project, { merge: true });
}

/**
 * Delete project from Firestore
 */
export async function deleteProjectFromCloud(slug: string): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, slug);
  await deleteDoc(docRef);
}

/**
 * Save About info to Firestore
 */
export async function saveAboutToCloud(about: AboutData): Promise<void> {
  const sanitized = sanitizeAboutData(about);
  const docRef = doc(db, SITE_CONTENT_COLLECTION, 'about');
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Save Resume info to Firestore
 */
export async function saveResumeToCloud(resume: ResumeData): Promise<void> {
  const sanitized = sanitizeResumeData(resume);
  const docRef = doc(db, SITE_CONTENT_COLLECTION, 'resume');
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Realtime listener for Projects
 */
export function subscribeToFirestoreProjects(callback: (projects: WorkProject[]) => void) {
  const colRef = collection(db, PROJECTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WorkProject[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WorkProject;
        if (data && data.slug) {
          list.push(data);
        }
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore projects listener warning:', error);
    }
  );
}

/**
 * Realtime listener for About
 */
export function subscribeToFirestoreAbout(callback: (about: AboutData | null) => void) {
  const docRef = doc(db, SITE_CONTENT_COLLECTION, 'about');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(sanitizeAboutData(docSnap.data() as Partial<AboutData>));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('Firestore about listener warning:', error);
    }
  );
}

/**
 * Realtime listener for Resume
 */
export function subscribeToFirestoreResume(callback: (resume: ResumeData | null) => void) {
  const docRef = doc(db, SITE_CONTENT_COLLECTION, 'resume');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(sanitizeResumeData(docSnap.data() as Partial<ResumeData>));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('Firestore resume listener warning:', error);
    }
  );
}
