// Embed the project source image so the teaching page remains portable offline.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const marker = '__SOURCE_IMAGE__';
if (html.includes(marker)) {
  const data = fs.readFileSync(path.join(root, 'assets', 'img-001.png')).toString('base64');
  fs.writeFileSync(htmlPath, html.replace(marker, 'data:image/png;base64,' + data), 'utf8');
  console.log('Embedded source image.');
} else {
  console.log('Source image is already embedded.');
}
