import fs from 'node:fs';

const requiredSounds = [
  'move.wav',
  'capture.mp3',
  'check.wav',
  'win.wav',
  'ui.wav',
];

for (const file of requiredSounds) {
  const path = `public/sounds/${file}`;
  const stat = fs.statSync(path);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`音效文件异常：${path}`);
  }
}

const credits = fs.readFileSync('ASSET_CREDITS.md', 'utf8');
const notices = fs.readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');

for (const text of ['Kenney UI Audio', 'Checkora', 'CC0', 'capture.mp3', 'check.wav']) {
  if (!credits.includes(text) || !notices.includes(text)) {
    throw new Error(`素材来源说明缺少：${text}`);
  }
}

console.log(`素材校验通过：${requiredSounds.length} 个音效文件`);
