const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(srcRelPath, destRelPath = srcRelPath) {
  const src = path.join(projectRoot, srcRelPath);
  const dest = path.join(projectRoot, 'dist', destRelPath);
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  ensureDir(distDir);

  // Copy static files
  copyFile('index.html');
  copyFile('styles.css');
  copyFile('game.js');

  // Optionally copy assets directory if present
  const assetsDir = path.join(projectRoot, 'assets');
  if (fs.existsSync(assetsDir)) {
    // shallow copy assets
    const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join('assets', entry.name);
      if (entry.isDirectory()) {
        // Recursively copy directories
        const stack = [[srcPath, path.join('assets', entry.name)]];
        while (stack.length) {
          const [rel, outRel] = stack.pop();
          const full = path.join(projectRoot, rel);
          const outFull = path.join(projectRoot, 'dist', outRel);
          ensureDir(outFull);
          for (const child of fs.readdirSync(full, { withFileTypes: true })) {
            const childRel = path.join(rel, child.name);
            const childOutRel = path.join(outRel, child.name);
            if (child.isDirectory()) {
              stack.push([childRel, childOutRel]);
            } else {
              const childSrc = path.join(projectRoot, childRel);
              const childDest = path.join(projectRoot, 'dist', childOutRel);
              ensureDir(path.dirname(childDest));
              fs.copyFileSync(childSrc, childDest);
            }
          }
        }
      } else {
        copyFile(srcPath, path.join('assets', entry.name));
      }
    }
  }

  // Simple HTML tweak: ensure scripts/styles are relative (no change needed if already)
  console.log('Build complete: dist/ ready');
}

main();
