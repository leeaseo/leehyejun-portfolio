const fs = require('fs');
const path = require('path');

function unpackImages() {
  const backupFile = path.resolve(__dirname, '../leehyejun-full-standalone-backup.json');
  const targetDir = path.resolve(__dirname, '../public/images/work');

  if (!fs.existsSync(backupFile)) {
    console.log('[Unpack] No standalone backup file found, skipping.');
    return;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  let count = 0;

  function saveBase64ToFile(base64Str, targetPath) {
    if (!base64Str || !base64Str.startsWith('data:image')) return;
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return;
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(targetPath, buffer);
    count++;
  }

  const allItems = [...(data.projects || []), ...(data.experiences || [])];

  for (const item of allItems) {
    if (item.thumbnail && item.thumbnail.startsWith('data:image')) {
      const slug = item.slug || 'project';
      const filename = `${slug}-thumb.jpg`;
      const fullPath = path.join(targetDir, filename);
      if (!fs.existsSync(fullPath)) {
        saveBase64ToFile(item.thumbnail, fullPath);
      }
    }
    if (Array.isArray(item.images)) {
      item.images.forEach((img, idx) => {
        if (img && img.startsWith('data:image')) {
          const slug = item.slug || 'project';
          const filename = `${slug}-${String(idx + 1).padStart(2, '0')}.jpg`;
          const fullPath = path.join(targetDir, filename);
          if (!fs.existsSync(fullPath)) {
            saveBase64ToFile(img, fullPath);
          }
        }
      });
    }
  }

  console.log(`[Unpack] Successfully verified and unpacked ${count} images into public/images/work/!`);
}

unpackImages();
