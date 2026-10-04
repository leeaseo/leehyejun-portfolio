import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchPortfolioFromFirestore, savePortfolioToFirestore } from './src/lib/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isExperienceSlug(slug?: string): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  return (
    s.includes('poing') ||
    s.includes('como') ||
    s.includes('librat') ||
    s.includes('convenset')
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support up to 100MB payload for uncompressed original high-resolution image uploads
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  const DATA_FILE = path.resolve(__dirname, 'src/content/custom-data.json');

  // Read current shared content across all devices (Local Disk First + Cloud Firestore Fallback)
  app.get('/api/content', async (req, res) => {
    try {
      // 1. Read from local disk custom-data.json first
      if (fs.existsSync(DATA_FILE)) {
        try {
          const localData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
          if (localData && (localData.projects || localData.experiences)) {
            return res.json(localData);
          }
        } catch (e) {
          console.warn('[Server] Error reading local data file:', e);
        }
      }

      // 2. Fallback to Cloud Firestore
      const firestoreData = await fetchPortfolioFromFirestore();
      if (firestoreData && Array.isArray((firestoreData as any).projects) && (firestoreData as any).projects.length > 0) {
        const allProjs = (firestoreData as any).projects;
        const workProjs = allProjs.filter((p: any) => !isExperienceSlug(p?.slug) && (!p?.order || p.order < 100));
        const expProjs = allProjs.filter((p: any) => isExperienceSlug(p?.slug) || (p?.order && p.order >= 100));

        const payload = {
          ...firestoreData,
          projects: workProjs,
          experiences: expProjs,
        };

        try {
          fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
        } catch {}
        return res.json(payload);
      }

      // 2. Fallback to local custom-data.json
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json(null);
    } catch (err) {
      console.error('Failed to read content data:', err);
      return res.status(500).json({ error: 'Failed to read data' });
    }
  });

  // Save updated content (persists across PC, Mobile, and all visitors worldwide)
  app.post('/api/publish', async (req, res) => {
    try {
      const payload = req.body;
      let current = { projects: [], about: {}, resume: {} };
      if (fs.existsSync(DATA_FILE)) {
        try {
          current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } catch {}
      }

      const updated = {
        ...current,
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save to local disk file
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      } catch (e) {
        console.warn('[Server] Could not write to disk:', e);
      }

      // 2. Save permanently to Google Cloud Firestore
      await savePortfolioToFirestore(updated);

      console.log('[Server] Successfully saved portfolio data to custom-data.json & Cloud Firestore');
      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[Server] Failed to save content data:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // In production with prebuilt dist
  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In dev, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Portfolio dev server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
  process.exit(1);
});
