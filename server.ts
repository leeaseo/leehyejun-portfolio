import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support up to 50MB payload for image base64 uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const DATA_FILE = path.resolve(__dirname, 'src/content/custom-data.json');

  // Read current shared content across all devices
  app.get('/api/content', (req, res) => {
    try {
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
  app.post('/api/publish', (req, res) => {
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

      fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      console.log('[Server] Successfully saved portfolio data to custom-data.json');
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
