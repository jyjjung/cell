/**
 * Single source of truth for the NDC Community Apps icon.
 *
 * Usage (from repo root):
 *   node scripts/generate-app-icon.mjs
 *
 * Renders scripts/assets/ndc-logo-source.svg into public/ favicon + PWA sizes.
 * App-specific icons under public/apps/ are unchanged.
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public');
const SOURCE = path.join(__dirname, 'assets', 'ndc-logo-source.svg');
const VERSION = 'v6';

function withBlackBackground(svg) {
  if (svg.includes('id="ndc-icon-bg"')) return svg;
  return svg.replace(
    /<svg([^>]*)>/,
    '<svg$1><rect id="ndc-icon-bg" width="2000" height="2000" fill="#000"/>',
  );
}

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
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

const targets = [
  [`icon-512x512-${VERSION}.png`, 512],
  [`icon-192x192-${VERSION}.png`, 192],
  [`apple-touch-icon-${VERSION}.png`, 180],
  [`favicon-32x32-${VERSION}.png`, 32],
  [`favicon-16x16-${VERSION}.png`, 16],
];

if (!fs.existsSync(SOURCE)) {
  console.error('Missing source logo:', SOURCE);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const rawSvg = fs.readFileSync(SOURCE, 'utf8');
const svg = withBlackBackground(rawSvg);

fs.writeFileSync(path.join(OUT, `icon-${VERSION}.svg`), svg);
console.log('wrote', `icon-${VERSION}.svg`);

const rendered = new Map();
for (const [name, size] of targets) {
  const buf = renderPng(svg, size);
  rendered.set(size, buf);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name);
}

const icoSizes = [16, 32, 48];
const ico = pngToIco(
  icoSizes.map((s) => rendered.get(s) ?? renderPng(svg, s)),
  icoSizes,
);
fs.writeFileSync(path.join(OUT, `favicon-${VERSION}.ico`), ico);
console.log('wrote', `favicon-${VERSION}.ico`);

const appFavicon = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');
fs.copyFileSync(path.join(OUT, `favicon-${VERSION}.ico`), appFavicon);
console.log('wrote', 'src/app/favicon.ico');
