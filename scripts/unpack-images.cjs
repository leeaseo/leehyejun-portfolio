const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function cleanProjectItem(p) {
  if (!p || !p.slug) return p;
  const safeSlug = (p.slug || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const isShowroom = p.slug === 'mobile-display-system';
  const s = (p.slug || '').toLowerCase();
  const isExp =
    (typeof p.order === 'number' && p.order >= 100) ||
    s.includes('poing') ||
    s.includes('como') ||
    s.includes('librat') ||
    s.includes('convenset');

  let cleanImages = Array.isArray(p.images)
    ? p.images.filter(
        (img) =>
          Boolean(img) &&
          !img.includes('display-system-1.jpg') &&
          !img.includes('display-system-2.jpg')
      )
    : [];
  cleanImages = Array.from(new Set(cleanImages));

  const numberedPhotoRegex = new RegExp(
    `^/images/work/${safeSlug}-\\d{2}(-[a-f0-9]+)?\\.(jpg|jpeg|png|webp)$`,
    'i'
  );
  const photoSet = new Set(cleanImages);

  let cleanBlocks = Array.isArray(p.moreBlocks)
    ? p.moreBlocks.map((b) => {
        const rawBlockImgs = Array.isArray(b && b.images) ? b.images.filter(Boolean) : [];
        const dedupedBlockImgs = Array.from(new Set(rawBlockImgs)).filter((img) => {
          if (photoSet.has(img) && numberedPhotoRegex.test(img)) {
            return false;
          }
          return true;
        });
        return {
          ...b,
          images: dedupedBlockImgs,
        };
      })
    : undefined;

  const moreImgSet = new Set();
  if (Array.isArray(cleanBlocks)) {
    for (const b of cleanBlocks) {
      for (const mImg of b.images || []) {
        if (mImg) moreImgSet.add(mImg);
      }
    }
  }

  let cleanThumb = p.thumbnail || '';

  if (isShowroom) {
    if (cleanThumb && !cleanImages.includes(cleanThumb) && !moreImgSet.has(cleanThumb)) {
      cleanImages = [cleanThumb, ...cleanImages];
    }
    cleanThumb = '';
  } else if (!isExp) {
    if (cleanImages.length > 0 || moreImgSet.has(cleanThumb)) {
      cleanThumb = '';
    }
    cleanImages = cleanImages.filter((img) => {
      const isNumberedLifestyle =
        /-\d{2}(-[a-f0-9]+)?\.(jpg|jpeg|png|webp)$/i.test(img) && !img.includes('-block');
      if (moreImgSet.has(img) && !isNumberedLifestyle) return false;
      if (cleanImages.length > 1 && /-thumb(-[a-f0-9]+)?(\.[a-z0-9]+)?$/i.test(img)) return false;
      return true;
    });
  }

  return {
    ...p,
    thumbnail: cleanThumb,
    images: cleanImages,
    moreBlocks: cleanBlocks,
  };
}

function syncAndUnpackAll() {
  const rootDir = path.resolve(__dirname, '..');
  const srcContentDir = path.resolve(rootDir, 'src/content');
  const targetDir = path.resolve(rootDir, 'public/images/work');
  const targetDataFile = path.resolve(srcContentDir, 'custom-data.json');
  const rootDataFile = path.resolve(rootDir, 'custom-data.json');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(srcContentDir)) {
    fs.mkdirSync(srcContentDir, { recursive: true });
  }

  // Prioritize src/content/custom-data.json and root custom-data.json ONLY (never merge stale backup/part files!)
  const candidateFiles = [];
  if (fs.existsSync(targetDataFile)) candidateFiles.push(targetDataFile);
  if (fs.existsSync(rootDataFile)) candidateFiles.push(rootDataFile);

  if (candidateFiles.length === 0) {
    console.log('[Sync-Build] No custom-data.json found.');
    return;
  }

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

      if (fileTime >= bestTime) {
        bestTime = fileTime;
        bestFile = file;
      }
    } catch {}
  }

  console.log(`[Sync-Build] Using source data file: ${path.relative(rootDir, bestFile)}`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(bestFile, 'utf8'));
  } catch (err) {
    console.error('[Sync-Build] Failed to parse source data file:', err);
    return;
  }

  let imageCount = 0;

  function saveBase64WithHash(base64Str, prefix) {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;
    const mime = matches[1].toLowerCase();
    const ext = mime === 'webp' ? 'webp' : mime === 'png' ? 'png' : 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
    const filename = `${prefix}-${hash}.${ext}`;
    const fullPath = path.join(targetDir, filename);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, buffer);
    }
    imageCount++;
    return `/images/work/${filename}`;
  }

  function processItem(rawItem) {
    const item = cleanProjectItem(rawItem);
    const safeSlug = (item.slug || `project-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (item.thumbnail && item.thumbnail.startsWith('data:image')) {
      item.thumbnail = saveBase64WithHash(item.thumbnail, `${safeSlug}-thumb`);
    }

    if (Array.isArray(item.images)) {
      item.images = item.images.map((img, idx) => {
        if (img && img.startsWith('data:image')) {
          return saveBase64WithHash(img, `${safeSlug}-${String(idx + 1).padStart(2, '0')}`);
        }
        return img;
      });
    }

    if (Array.isArray(item.processImages)) {
      item.processImages = item.processImages.map((img, idx) => {
        if (img && img.startsWith('data:image')) {
          return saveBase64WithHash(img, `${safeSlug}-process-${String(idx + 1).padStart(2, '0')}`);
        }
        return img;
      });
    }

    if (Array.isArray(item.moreBlocks)) {
      item.moreBlocks = item.moreBlocks.map((block, bIdx) => ({
        ...block,
        images: Array.isArray(block.images)
          ? block.images.map((img, iIdx) => {
              if (img && img.startsWith('data:image')) {
                return saveBase64WithHash(
                  img,
                  `${safeSlug}-block${bIdx + 1}-${String(iIdx + 1).padStart(2, '0')}`
                );
              }
              return img;
            })
          : [],
      }));
    }

    return cleanProjectItem(item);
  }

  if (Array.isArray(data.projects)) {
    data.projects = data.projects
      .filter((p) => p && p.slug)
      .map(processItem)
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  if (Array.isArray(data.experiences)) {
    data.experiences = data.experiences.filter((e) => e && e.slug).map(processItem);
  }

  if (data.about && data.about.profileImage && data.about.profileImage.startsWith('data:image')) {
    const matches = data.about.profileImage.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const profilePath = path.resolve(rootDir, 'public/images/profile.jpg');
      fs.writeFileSync(profilePath, Buffer.from(matches[2], 'base64'));
      data.about.profileImage = '/images/profile.jpg';
      imageCount++;
    }
  }

  const jsonStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(targetDataFile, jsonStr, 'utf8');
  fs.writeFileSync(rootDataFile, jsonStr, 'utf8');

  console.log(
    `[Sync-Build] Successfully synced clean data to src/content/custom-data.json (extracted ${imageCount} images into public/images/work/)`
  );
}

syncAndUnpackAll();
