/**
 * generate-assets.js
 * Creates valid placeholder PNG files for Expo prebuild.
 * Run with: node scripts/generate-assets.js
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, r, g, b) {
  // Build raw pixel rows (filter byte 0 + RGB pixels)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const off = y * (1 + width * 3) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);

  // CRC32 table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length, 0);
    const c = Buffer.allocUnsafe(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([l, t, data, c]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });

// Navy blue #1B2A4A = rgb(27, 42, 74)
const R = 27, G = 42, B = 74;

const assets = [
  { file: 'icon.png',          w: 1024, h: 1024 },
  { file: 'adaptive-icon.png', w: 1024, h: 1024 },
  { file: 'splash.png',        w: 1284, h: 2778 },
  { file: 'favicon.png',       w: 48,   h: 48   },
];

for (const { file, w, h } of assets) {
  fs.writeFileSync(path.join(dir, file), createPng(w, h, R, G, B));
  console.log(`Created ${file} (${w}x${h})`);
}

console.log('\nAll assets generated successfully.');
