import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkProject, AboutData, ResumeData } from './types';

// Initialize Firebase client
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Test connection as instructed by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection verified successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client is offline or database initializing.');
    }
  }
}
testConnection();

// ==========================================
// 1. Projects Realtime Cloud Sync
// ==========================================
export function subscribeToFirestoreProjects(
  callback: (projects: WorkProject[]) => void
) {
  const projectsRef = collection(db, 'projects');
  return onSnapshot(
    projectsRef,
    (snapshot) => {
      const projects: WorkProject[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WorkProject;
        projects.push(data);
      });
      // Sort by order ascending
      projects.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(projects);
    },
    (err) => {
      console.warn('Firestore projects snapshot listener error:', err);
    }
  );
}

export async function saveProjectToCloud(project: WorkProject): Promise<void> {
  try {
    const docRef = doc(db, 'projects', project.slug);
    await setDoc(docRef, {
      ...project,
      updatedAt: new Date().toISOString(),
    });
    console.log(`Project ${project.slug} saved to Firebase Firestore successfully.`);
  } catch (err) {
    console.error('Failed to save project to Firestore:', err);
    throw err;
  }
}

export async function deleteProjectFromCloud(slug: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', slug);
    await deleteDoc(docRef);
    console.log(`Project ${slug} deleted from Firebase Firestore successfully.`);
  } catch (err) {
    console.error('Failed to delete project from Firestore:', err);
    throw err;
  }
}

// ==========================================
// 2. About Data Cloud Sync
// ==========================================
export function subscribeToFirestoreAbout(
  callback: (about: AboutData | null) => void
) {
  const aboutRef = doc(db, 'site_content', 'about');
  return onSnapshot(
    aboutRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data.data as AboutData);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Firestore about listener error:', err);
    }
  );
}

export async function saveAboutToCloud(about: AboutData): Promise<void> {
  try {
    const docRef = doc(db, 'site_content', 'about');
    await setDoc(docRef, {
      type: 'about',
      data: about,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save about to Firestore:', err);
    throw err;
  }
}

// ==========================================
// 3. Resume Data Cloud Sync
// ==========================================
export function subscribeToFirestoreResume(
  callback: (resume: ResumeData | null) => void
) {
  const resumeRef = doc(db, 'site_content', 'resume');
  return onSnapshot(
    resumeRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(data.data as ResumeData);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Firestore resume listener error:', err);
    }
  );
}

export async function saveResumeToCloud(resume: ResumeData): Promise<void> {
  try {
    const docRef = doc(db, 'site_content', 'resume');
    await setDoc(docRef, {
      type: 'resume',
      data: resume,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save resume to Firestore:', err);
    throw err;
  }
}
