const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

  // Keep all data:image Base64 strings intact inside custom-data.json so re-exporting from the live site NEVER loses embedded images!
  const jsonStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(targetDataFile, jsonStr, 'utf8');
  fs.writeFileSync(rootDataFile, jsonStr, 'utf8');

  console.log('[Sync-Build] Successfully synced custom-data.json with full embedded images preserved.');
}

syncAndUnpackAll();
