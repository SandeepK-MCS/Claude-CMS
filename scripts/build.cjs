const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('[Build] Compiling server-app.ts with esbuild...');
execSync('npx esbuild server-app.ts --bundle --platform=node --format=cjs --outfile=dist/server.cjs --packages=external', {
  stdio: 'inherit',
  cwd: rootDir
});

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy index.html into dist/
const rootIndexHtml = path.join(rootDir, 'index.html');
const distIndexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(rootIndexHtml)) {
  fs.copyFileSync(rootIndexHtml, distIndexHtml);
  console.log('[Build] Copied index.html -> dist/index.html');
}

// 2. Copy public directory contents to dist/
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true, force: true });
  console.log('[Build] Copied public/ -> dist/');
}

console.log('[Build] Build completed successfully.');
