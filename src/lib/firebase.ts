import { WorkProject } from './types';

export async function fetchPortfolioFromFirestore(): Promise<{
  projects?: WorkProject[];
  about?: any;
  resume?: any;
  updatedAt?: string;
  exportedAt?: string;
} | null> {
  // Primary source of truth is /api/content (src/content/custom-data.json + public/images/work) and Browser IndexedDB
  return null;
}

export async function savePortfolioToFirestore(_data: {
  projects?: WorkProject[];
  experiences?: WorkProject[];
  about?: any;
  resume?: any;
}): Promise<boolean> {
  // Rely on local server disk (/api/publish -> src/content/custom-data.json + public/images/work), IndexedDB, and GitHub backup without hitting Firestore free-tier daily write quota
  return true;
}

export async function deleteProjectFromFirestore(_slug: string): Promise<void> {
  return;
}

