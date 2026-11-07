import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

  // Serve static assets from public directory with high performance and correct mime types
  const publicDir = path.resolve(__dirname, 'public');
  app.use(express.static(publicDir));

  const DATA_FILE = path.resolve(__dirname, 'src/content/custom-data.json');

  function extractAndSaveBase64Images(data: any): any {
    const imagesDir = path.resolve(__dirname, 'public/images/work');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    function saveBase64(base64Str: string, prefix: string): string {
      const matches = base64Str.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return base64Str;
      }
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
      const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safePrefix}-${hash}.${ext}`;
      const filePath = path.join(imagesDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
      }
      return `/images/work/${filename}`;
    }

    if (Array.isArray(data.projects)) {
      data.projects = data.projects.map((proj: any) => {
        const safeSlug = (proj.slug || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
        const p = { ...proj };
        if (typeof p.thumbnail === 'string' && p.thumbnail.startsWith('data:image')) {
          p.thumbnail = saveBase64(p.thumbnail, `${safeSlug}-thumb`);
        }
        if (Array.isArray(p.images)) {
          p.images = p.images.map((img: string, idx: number) => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
              return saveBase64(img, `${safeSlug}-${String(idx + 1).padStart(2, '0')}`);
            }
            return img;
          });
        }
        if (Array.isArray(p.processImages)) {
          p.processImages = p.processImages.map((img: string, idx: number) => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
              return saveBase64(img, `${safeSlug}-process-${String(idx + 1).padStart(2, '0')}`);
            }
            return img;
          });
        }
        if (Array.isArray(p.moreBlocks)) {
          p.moreBlocks = p.moreBlocks.map((block: any, bIdx: number) => ({
            ...block,
            images: Array.isArray(block.images)
              ? block.images.map((img: string, iIdx: number) => {
                  if (typeof img === 'string' && img.startsWith('data:image')) {
                    return saveBase64(
                      img,
                      `${safeSlug}-block${bIdx + 1}-${String(iIdx + 1).padStart(2, '0')}`
                    );
                  }
                  return img;
                })
              : [],
          }));
        }
        return p;
      });
    }

    if (Array.isArray(data.experiences)) {
      data.experiences = data.experiences.map((exp: any) => {
        const safeSlug = (exp.slug || 'exp').replace(/[^a-zA-Z0-9_-]/g, '_');
        const e = { ...exp };
        if (typeof e.thumbnail === 'string' && e.thumbnail.startsWith('data:image')) {
          e.thumbnail = saveBase64(e.thumbnail, `${safeSlug}-thumb`);
        }
        if (Array.isArray(e.images)) {
          e.images = e.images.map((img: string, idx: number) => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
              return saveBase64(img, `${safeSlug}-${String(idx + 1).padStart(2, '0')}`);
            }
            return img;
          });
        }
        if (Array.isArray(e.processImages)) {
          e.processImages = e.processImages.map((img: string, idx: number) => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
              return saveBase64(img, `${safeSlug}-process-${String(idx + 1).padStart(2, '0')}`);
            }
            return img;
          });
        }
        if (Array.isArray(e.moreBlocks)) {
          e.moreBlocks = e.moreBlocks.map((block: any, bIdx: number) => ({
            ...block,
            images: Array.isArray(block.images)
              ? block.images.map((img: string, iIdx: number) => {
                  if (typeof img === 'string' && img.startsWith('data:image')) {
                    return saveBase64(
                      img,
                      `${safeSlug}-block${bIdx + 1}-${String(iIdx + 1).padStart(2, '0')}`
                    );
                  }
                  return img;
                })
              : [],
          }));
        }
        return e;
      });
    }

    return data;
  }



  // Read current shared content across all devices (Compare Local Disk & Cloud Firestore by timestamp)
  app.get('/api/content', async (req, res) => {
    try {
      let localData: any = null;
      if (fs.existsSync(DATA_FILE)) {
        try {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          localData = JSON.parse(raw);
        } catch (e) {
          console.warn('[Server] Error reading local data file:', e);
        }
      }

      const firestoreData = await fetchPortfolioFromFirestore();
      const localTime = localData?.updatedAt
        ? new Date(localData.updatedAt).getTime()
        : localData?.exportedAt
        ? new Date(localData.exportedAt).getTime()
        : 0;
      const fsTime = firestoreData?.updatedAt
        ? new Date(firestoreData.updatedAt).getTime()
        : firestoreData?.exportedAt
        ? new Date(firestoreData.exportedAt).getTime()
        : 0;

      if (
        firestoreData &&
        Array.isArray((firestoreData as any).projects) &&
        (firestoreData as any).projects.length > 0 &&
        (!localData || fsTime > localTime)
      ) {
        const allProjs = (firestoreData as any).projects;
        const workProjs = allProjs.filter(
          (p: any) => !isExperienceSlug(p?.slug) && (!p?.order || p.order < 100)
        );
        const expProjs = allProjs.filter(
          (p: any) => isExperienceSlug(p?.slug) || (p?.order && p.order >= 100)
        );

        const rawPayload = {
          about: firestoreData.about || localData?.about,
          resume: firestoreData.resume || localData?.resume,
          projects: workProjs,
          experiences: expProjs.length > 0 ? expProjs : localData?.experiences || [],
          updatedAt: firestoreData.updatedAt || new Date().toISOString(),
          exportedAt: firestoreData.exportedAt || firestoreData.updatedAt || new Date().toISOString(),
        };

        // Extract any offloaded base64 images from Firestore into static /public/images/work/*.jpg files
        const diskSynced = extractAndSaveBase64Images(JSON.parse(JSON.stringify(rawPayload)));
        try {
          const jsonStr = JSON.stringify(diskSynced, null, 2);
          fs.writeFileSync(DATA_FILE, jsonStr, 'utf-8');
          fs.writeFileSync(path.resolve(__dirname, 'custom-data.json'), jsonStr, 'utf-8');
        } catch (e) {
          console.warn('[Server] Could not sync Firestore data to local disk:', e);
        }
        return res.json(diskSynced);
      }

      if (localData && (localData.projects || localData.experiences)) {
        return res.json(localData);
      }

      return res.json(null);
    } catch (err) {
      console.error('Failed to read content data:', err);
      return res.status(500).json({ error: 'Failed to read data' });
    }
  });

  function convertPathsToStandaloneBase64(data: any): any {
    const result = JSON.parse(JSON.stringify(data));
    const pathToBase64 = (imgRelPath: string) => {
      if (!imgRelPath || imgRelPath.startsWith('data:') || imgRelPath.startsWith('http')) return imgRelPath;
      const cleanPath = imgRelPath.startsWith('/') ? imgRelPath.slice(1) : imgRelPath;
      const fullPath = path.resolve(publicDir, cleanPath);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpeg';
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        const buf = fs.readFileSync(fullPath);
        return `data:image/${mime};base64,${buf.toString('base64')}`;
      }
      return imgRelPath;
    };

    if (Array.isArray(result.projects)) {
      result.projects = result.projects.map((p: any) => ({
        ...p,
        thumbnail: pathToBase64(p.thumbnail),
        images: Array.isArray(p.images) ? p.images.map(pathToBase64) : [],
        processImages: Array.isArray(p.processImages) ? p.processImages.map(pathToBase64) : [],
        moreBlocks: Array.isArray(p.moreBlocks)
          ? p.moreBlocks.map((b: any) => ({
              ...b,
              images: Array.isArray(b.images) ? b.images.map(pathToBase64) : [],
            }))
          : undefined,
      }));
    }
    if (Array.isArray(result.experiences)) {
      result.experiences = result.experiences.map((e: any) => ({
        ...e,
        thumbnail: pathToBase64(e.thumbnail),
        images: Array.isArray(e.images) ? e.images.map(pathToBase64) : [],
        processImages: Array.isArray(e.processImages) ? e.processImages.map(pathToBase64) : [],
        moreBlocks: Array.isArray(e.moreBlocks)
          ? e.moreBlocks.map((b: any) => ({
              ...b,
              images: Array.isArray(b.images) ? b.images.map(pathToBase64) : [],
            }))
          : undefined,
      }));
    }
    if (result.about && result.about.profileImage) {
      result.about.profileImage = pathToBase64(result.about.profileImage);
    }
    return result;
  }

  // Full backup endpoint for downloading clean JSON with embedded photos for 1-click GitHub sync
  app.get('/api/backup-full', async (req, res) => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const standalone = convertPathsToStandaloneBase64(raw);
        const jsonStr = JSON.stringify(standalone, null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="custom-data.json"');
        return res.send(jsonStr);
      }
      return res.status(404).json({ error: 'No data file found' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate backup' });
    }
  });

  // Save updated content (persists across PC, Mobile, and all visitors worldwide)
  app.post('/api/publish', async (req, res) => {
    try {
      const payload = req.body;
      const nowIso = new Date().toISOString();
      let current = { projects: [], about: {}, resume: {} };
      if (fs.existsSync(DATA_FILE)) {
        try {
          current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } catch {}
      }

      // Keep raw base64 copy for Cloud Firestore so new images survive across serverless containers
      const firestoreCopy = JSON.parse(
        JSON.stringify({
          ...current,
          ...payload,
          updatedAt: nowIso,
          exportedAt: nowIso,
        })
      );

      // Also write static image files to public/images/work on local disk without stripping base64 from custom-data.json
      try {
        extractAndSaveBase64Images(JSON.parse(JSON.stringify(payload)));
      } catch {}

      const updated = {
        ...current,
        ...payload,
        updatedAt: nowIso,
        exportedAt: nowIso,
      };

      // 1. Save to local disk file (src/content/custom-data.json, root custom-data.json, backup file)
      try {
        const jsonStr = JSON.stringify(updated, null, 2);
        fs.writeFileSync(DATA_FILE, jsonStr, 'utf-8');
        fs.writeFileSync(path.resolve(__dirname, 'custom-data.json'), jsonStr, 'utf-8');
        fs.writeFileSync(path.resolve(__dirname, 'leehyejun-portfolio-backup-2026-10-05.json'), jsonStr, 'utf-8');
      } catch (e) {
        console.warn('[Server] Could not write to disk:', e);
      }

      // 2. Save to Google Cloud Firestore in background without blocking HTTP response
      savePortfolioToFirestore(firestoreCopy).catch(() => {});

      console.log('[Server] Successfully saved portfolio data to disk');
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
