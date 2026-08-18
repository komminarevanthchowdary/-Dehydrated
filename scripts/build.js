const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists and is clean
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// List of files and folders to copy to dist
const itemsToCopy = [
  'index.html',
  'products.html',
  'moringa.html',
  'style.css',
  'moringa.css',
  'script.js',
  'moringa.js',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
  'images'
];

for (const item of itemsToCopy) {
  const src = path.join(__dirname, '..', item);
  const dest = path.join(distDir, item);

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied ${item} to dist/`);
  }
}

console.log('\n🚀 Build complete! Static assets prepared in dist/ folder.');
