/**
 * Single source of truth for the NDC Community Apps icon.
 *
 * Usage (from repo root, after npm i -D @resvg/resvg-js):
 *   node scripts/generate-app-icon.mjs
 *
 * Writes SVG + all PNG/ICO sizes into public/ from the SVG below.
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public');
const VERSION = 'v5';

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="NDC">
  <rect width="512" height="512" fill="#161616"/>
  <text
    x="256"
    y="298"
    text-anchor="middle"
    font-family="Arial Black, Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="152"
    font-weight="900"
    fill="#f3f0e8"
    letter-spacing="-6"
  >NDC</text>
</svg>`;

function renderPng(size) {
  const resvg = new Resvg(SVG, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

function pngToIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const entry = Buffer.alloc(16);
    const s = sizes[i];
    entry[0] = s >= 256 ? 0 : s;
    entry[1] = s >= 256 ? 0 : s;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push({ entry, png });
    offset += png.length;
  }
  return Buffer.concat([header, ...entries.map((e) => e.entry), ...entries.map((e) => e.png)]);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `icon-${VERSION}.svg`), SVG);

const targets = [
  [`icon-512x512-${VERSION}.png`, 512],
  [`icon-192x192-${VERSION}.png`, 192],
  [`apple-touch-icon-${VERSION}.png`, 180],
  [`favicon-32x32-${VERSION}.png`, 32],
  [`favicon-16x16-${VERSION}.png`, 16],
];

for (const [name, size] of targets) {
  const buf = renderPng(size);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name);
}

const icoSizes = [16, 32, 48];
const ico = pngToIco(
  icoSizes.map((s) => renderPng(s)),
  icoSizes,
);
fs.writeFileSync(path.join(OUT, `favicon-${VERSION}.ico`), ico);
console.log('wrote', `favicon-${VERSION}.ico`);
