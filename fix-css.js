const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Read all module.css files in app/
function processFiles() {
  // Simple glob manually
  const scan = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(scan(file));
      } else if (file.endsWith('.module.css')) {
        results.push(file);
      }
    });
    return results;
  };

  const files = scan(path.join(process.cwd(), 'app'));
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Remove background: radial-gradient(...)
    if (content.includes('radial-gradient')) {
      content = content.replace(/background:\s*radial-gradient\([\s\S]*?\)(,\s*transparent)?;/g, '');
      changed = true;
    }

    // 2. Add or update @media (max-width: 768px) { .page { padding: 32px 12px 64px; } }
    if (content.includes('.page {')) {
      if (!content.includes('@media (max-width: 768px) { .page')) {
        content += '\n@media (max-width: 768px) {\n  .page {\n    padding: 24px 12px 64px !important;\n  }\n}\n';
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  });
}
processFiles();
