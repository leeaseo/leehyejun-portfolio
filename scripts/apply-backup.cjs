const fs = require('fs');
const path = require('path');

function applyBackup() {
  const backupFile = path.resolve(__dirname, '../leehyejun-portfolio-backup-2026-10-05.json');
  if (!fs.existsSync(backupFile)) {
    console.error('Backup file not found at:', backupFile);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const customDataPath = path.resolve(__dirname, '../src/content/custom-data.json');
  let existingExperiences = [];

  if (fs.existsSync(customDataPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));
      if (Array.isArray(existing.experiences)) {
        existingExperiences = existing.experiences;
      }
    } catch (e) {
      console.warn('Could not parse existing custom-data.json:', e);
    }
  }

  const merged = {
    exportedAt: backup.exportedAt || new Date().toISOString(),
    projects: backup.projects || [],
    about: backup.about || {},
    resume: backup.resume || {},
    experiences: existingExperiences,
  };

  fs.writeFileSync(customDataPath, JSON.stringify(merged, null, 2), 'utf8');
  fs.writeFileSync(path.resolve(__dirname, '../custom-data.json'), JSON.stringify(merged, null, 2), 'utf8');

  if (backup.about) {
    fs.writeFileSync(path.resolve(__dirname, '../src/content/about.json'), JSON.stringify(backup.about, null, 2), 'utf8');
  }
  if (backup.resume) {
    fs.writeFileSync(path.resolve(__dirname, '../src/content/resume.json'), JSON.stringify(backup.resume, null, 2), 'utf8');
  }

  console.log('Successfully applied latest portfolio backup data!');
  console.log('- Projects count:', merged.projects.length);
  console.log('- Experiences count:', merged.experiences.length);
}

applyBackup();
