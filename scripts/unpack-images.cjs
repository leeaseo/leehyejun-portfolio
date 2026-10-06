const fs = require('fs');
const path = require('path');

function syncAndUnpackAll() {
  const rootDir = path.resolve(__dirname, '..');
  const srcContentDir = path.resolve(rootDir, 'src/content');
  const targetDir = path.resolve(rootDir, 'public/images/work');
  const targetDataFile = path.resolve(srcContentDir, 'custom-data.json');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(srcContentDir)) {
    fs.mkdirSync(srcContentDir, { recursive: true });
  }

  // 1. Find all candidate backup/data JSON files in root and src/content
  const candidateFiles = [];

  try {
    const rootEntries = fs.readdirSync(rootDir);
    for (const entry of rootEntries) {
      if (
        entry.endsWith('.json') &&
        (entry === 'custom-data.json' ||
          entry.startsWith('leehyejun-portfolio-backup') ||
          entry.startsWith('leehyejun-full-standalone-backup') ||
          entry.startsWith('portfolio-backup'))
      ) {
        candidateFiles.push(path.resolve(rootDir, entry));
      }
    }
  } catch (e) {
    console.warn('[Sync-Build] Error reading root dir:', e);
  }

  if (fs.existsSync(targetDataFile)) {
    candidateFiles.push(targetDataFile);
  }

  if (candidateFiles.length === 0) {
    console.log('[Sync-Build] No backup or custom-data JSON files found.');
    return;
  }

  // 2. Select the newest file based on mtime or exportedAt timestamp
  let bestFile = candidateFiles[0];
  let bestTime = 0;

  for (const file of candidateFiles) {
    try {
      const stats = fs.statSync(file);
      let fileTime = stats.mtimeMs;
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed.exportedAt) {
          const expTime = new Date(parsed.exportedAt).getTime();
          if (!isNaN(expTime)) fileTime = Math.max(fileTime, expTime);
        }
        if (parsed.updatedAt) {
          const upTime = new Date(parsed.updatedAt).getTime();
          if (!isNaN(upTime)) fileTime = Math.max(fileTime, upTime);
        }
      } catch {}

      if (fileTime > bestTime) {
        bestTime = fileTime;
        bestFile = file;
      }
    } catch {}
  }

  console.log(`[Sync-Build] Using newest source data file: ${path.basename(bestFile)}`);

  // 3. Read and process data
  let data;
  try {
    data = JSON.parse(fs.readFileSync(bestFile, 'utf8'));
  } catch (err) {
    console.error('[Sync-Build] Failed to parse source data file:', err);
    return;
  }

  let imageCount = 0;

  function saveBase64ToFile(base64Str, targetPath) {
    if (!base64Str || !base64Str.startsWith('data:image')) return false;
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return false;
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(targetPath, buffer);
    imageCount++;
    return true;
  }

  const allItems = [...(data.projects || []), ...(data.experiences || [])];

  for (const item of allItems) {
    if (item.thumbnail && item.thumbnail.startsWith('data:image')) {
      const slug = item.slug || `project-${Date.now()}`;
      const filename = `${slug}-thumb.jpg`;
      const fullPath = path.join(targetDir, filename);
      saveBase64ToFile(item.thumbnail, fullPath);
      item.thumbnail = `/images/work/${filename}`;
    }

    if (Array.isArray(item.images)) {
      item.images = item.images.map((img, idx) => {
        if (img && img.startsWith('data:image')) {
          const slug = item.slug || `project-${Date.now()}`;
          const filename = `${slug}-${String(idx + 1).padStart(2, '0')}.jpg`;
          const fullPath = path.join(targetDir, filename);
          saveBase64ToFile(img, fullPath);
          return `/images/work/${filename}`;
        }
        return img;
      });
    }
  }

  if (data.about && data.about.profileImage && data.about.profileImage.startsWith('data:image')) {
    const profilePath = path.resolve(rootDir, 'public/images/profile.jpg');
    if (saveBase64ToFile(data.about.profileImage, profilePath)) {
      data.about.profileImage = '/images/profile.jpg';
    }
  }

  // 4. Save synced data to src/content/custom-data.json and root custom-data.json
  const jsonStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(targetDataFile, jsonStr, 'utf8');
  fs.writeFileSync(path.resolve(rootDir, 'custom-data.json'), jsonStr, 'utf8');

  console.log(
    `[Sync-Build] Successfully synced data to src/content/custom-data.json (extracted ${imageCount} images into public/images/work/)`
  );
}

syncAndUnpackAll();
