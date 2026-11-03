/**
 * generate-icon.js
 *
 * Generates shield PNG icons at all required Android/Expo sizes.
 * Uses pure Node.js + zlib — no external dependencies.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── PNG utilities ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length);
  const c = Buffer.allocUnsafe(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, c]);
}

function makePng(pixels, w, h) {
  // pixels: Uint8Array of RGBA values, row by row
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      const dst = y * (1 + w * 4) + 1 + x * 4;
      raw[dst]   = pixels[src];     // R
      raw[dst+1] = pixels[src+1];   // G
      raw[dst+2] = pixels[src+2];   // B
      raw[dst+3] = pixels[src+3];   // A
    }
  }
  const compressed = zlib.deflateSync(raw);
  const sig  = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0; // RGBA
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))]);
}

// ─── Shield drawing ───────────────────────────────────────────────────────────

function drawShieldIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // transparent default

  // Background circle — navy blue #1B2A4A
  const BG_R = 27, BG_G = 42, BG_B = 74;
  // Shield body — white
  const SH_R = 255, SH_G = 255, SH_B = 255;
  // Shield inner — blue #2563EB
  const IN_R = 37, IN_G = 99, IN_B = 235;
  // GL tick/check — white
  const TK_R = 255, TK_G = 255, TK_B = 255;

  const cx = size / 2, cy = size / 2;
  const radius = size * 0.48;

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    pixels[i]   = r;
    pixels[i+1] = g;
    pixels[i+2] = b;
    pixels[i+3] = a;
  }

  function fillCircle(x0, y0, r, R, G, B, A) {
    for (let y = Math.floor(y0 - r); y <= Math.ceil(y0 + r); y++) {
      for (let x = Math.floor(x0 - r); x <= Math.ceil(x0 + r); x++) {
        const dist = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
        if (dist <= r) {
          // Anti-alias at edge
          const alpha = dist > r - 1 ? Math.round((r - dist) * A) : A;
          setPixel(x, y, R, G, B, alpha);
        }
      }
    }
  }

  // Filled background circle
  fillCircle(cx, cy, radius, BG_R, BG_G, BG_B, 255);

  // Shield shape — draw using polygon fill
  // Shield defined by relative control points scaled to size
  const s = size;
  function shieldPath(scale, fillR, fillG, fillB) {
    // Shield points (normalized 0-1, center is 0.5)
    // Top-left, top-right, bottom-point, left-mid, right-mid
    const pts = [
      [0.22, 0.15], // top-left
      [0.78, 0.15], // top-right
      [0.78, 0.48], // right shoulder
      [0.50, 0.85], // bottom tip
      [0.22, 0.48], // left shoulder
    ].map(([x, y]) => [
      cx + (x - 0.5) * s * scale,
      cy + (y - 0.5) * s * scale,
    ]);

    // Scanline fill
    const minY = Math.floor(Math.min(...pts.map(p => p[1])));
    const maxY = Math.ceil(Math.max(...pts.map(p => p[1])));

    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
          intersections.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let k = 0; k < intersections.length - 1; k += 2) {
        const xStart = Math.floor(intersections[k]);
        const xEnd   = Math.ceil(intersections[k + 1]);
        for (let x = xStart; x <= xEnd; x++) setPixel(x, y, fillR, fillG, fillB, 255);
      }
    }
  }

  // Outer white shield
  shieldPath(0.72, SH_R, SH_G, SH_B);
  // Inner blue shield (slightly smaller)
  shieldPath(0.60, IN_R, IN_G, IN_B);

  // Draw a white "G" letter in the centre — simplified as tick/checkmark
  // Thick white tick
  const tc = s * 0.065; // stroke thickness
  function drawThickLine(x1, y1, x2, y2, r, g, b, thick) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len * thick / 2, ny = dx / len * thick / 2;
    // Fill parallelogram
    const steps = Math.ceil(len * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x1 + dx * t, py = y1 + dy * t;
      for (let w = -thick/2; w <= thick/2; w++) {
        setPixel(Math.round(px + nx * w / (thick/2)), Math.round(py + ny * w / (thick/2)), r, g, b, 255);
      }
    }
  }

  // White checkmark / tick in the shield
  const tickMid = { x: cx, y: cy + s * 0.04 };
  drawThickLine(cx - s*0.14, cy + s*0.01, tickMid.x - s*0.02, tickMid.y + s*0.12, TK_R, TK_G, TK_B, tc);
  drawThickLine(tickMid.x - s*0.02, tickMid.y + s*0.12, cx + s*0.18, cy - s*0.10, TK_R, TK_G, TK_B, tc);

  return pixels;
}

// ─── Generate all sizes ───────────────────────────────────────────────────────

const assetsDir = path.join(__dirname, '..', 'assets');
const resDir    = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const sizes = [
  { size: 1024, file: path.join(assetsDir, 'icon.png') },
  { size: 1024, file: path.join(assetsDir, 'adaptive-icon.png') },
  { size: 48,   file: path.join(assetsDir, 'favicon.png') },
  // Android mipmap sizes
  { size: 48,   file: path.join(resDir, 'mipmap-mdpi',    'ic_launcher.png') },
  { size: 72,   file: path.join(resDir, 'mipmap-hdpi',    'ic_launcher.png') },
  { size: 96,   file: path.join(resDir, 'mipmap-xhdpi',   'ic_launcher.png') },
  { size: 144,  file: path.join(resDir, 'mipmap-xxhdpi',  'ic_launcher.png') },
  { size: 192,  file: path.join(resDir, 'mipmap-xxxhdpi', 'ic_launcher.png') },
  { size: 48,   file: path.join(resDir, 'mipmap-mdpi',    'ic_launcher_round.png') },
  { size: 72,   file: path.join(resDir, 'mipmap-hdpi',    'ic_launcher_round.png') },
  { size: 96,   file: path.join(resDir, 'mipmap-xhdpi',   'ic_launcher_round.png') },
  { size: 144,  file: path.join(resDir, 'mipmap-xxhdpi',  'ic_launcher_round.png') },
  { size: 192,  file: path.join(resDir, 'mipmap-xxxhdpi', 'ic_launcher_round.png') },
];

console.log('Generating shield icons...');
for (const { size, file } of sizes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const pixels = drawShieldIcon(size);
  const png    = makePng(pixels, size, size);
  fs.writeFileSync(file, png);
  console.log(`  ✓ ${size}x${size}  →  ${path.relative(path.join(__dirname, '..'), file)}`);
}
console.log('\nAll shield icons generated!');
