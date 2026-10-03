import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export async function fetchPortfolioFromFirestore() {
  try {
    const docRef = doc(db, 'content', 'portfolio');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Failed to read portfolio:', err);
  }
  return null;
}

export async function savePortfolioToFirestore(data: any) {
  try {
    const docRef = doc(db, 'content', 'portfolio');
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('[Firestore] Successfully saved portfolio data to Cloud Firestore!');
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to save portfolio:', err);
    return false;
  }
}
