/* gen-og.js — genera og.png (1200×630) zero-dipendenze: gradient + mark ΛΛ + bitmap font.
   Script di build: node gen-og.js. Sostituibile con un OG designed quando serve. */
const zlib = require('zlib'), fs = require('fs');
const W = 1200, H = 630;
const px = Buffer.alloc(W * H * 3);

function setpx(x, y, r, g, b) { const i = (y * W + x) * 3; px[i] = r; px[i + 1] = g; px[i + 2] = b; }
function blend(x, y, r, g, b, a) {
  const i = (y * W + x) * 3;
  px[i] = Math.round(px[i] * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
}

// background: gradient navy + glow indigo (alto sx) + glow champagne (basso dx)
const top = [10, 15, 31], bot = [5, 6, 14];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = y / H;
    let r = top[0] + (bot[0] - top[0]) * t, g = top[1] + (bot[1] - top[1]) * t, b = top[2] + (bot[2] - top[2]) * t;
    const d1 = Math.hypot(x - 540, y - 80), f1 = Math.max(0, 1 - d1 / 760), a1 = 0.26 * f1;
    r += (124 - r) * a1; g += (108 - g) * a1; b += (255 - b) * a1;
    const d2 = Math.hypot(x - 950, y - 600), f2 = Math.max(0, 1 - d2 / 640), a2 = 0.16 * f2;
    r += (0 - r) * a2; g += (229 - g) * a2; b += (192 - b) * a2;
    setpx(x, y, Math.round(r), Math.round(g), Math.round(b));
  }
}

// mark ΛΛ — chevron: gambe da picco a base, valley a v=0.48
function insideChevron(u, v) {
  return (u >= 0.5 - 0.5 * v && u <= 0.62 - 0.5 * v) || (u >= 0.38 + 0.5 * v && u <= 0.5 + 0.5 * v);
}
function drawChevron(x0, y0, w, h, color, alpha) {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      const u = (x - x0) / w, v = (y - y0) / h;
      if (insideChevron(u, v)) blend(x, y, color[0], color[1], color[2], alpha);
    }
  }
}
const ivory = [234, 242, 255], gold = [0, 229, 192];
drawChevron(470, 100, 110, 170, ivory, 1);
drawChevron(620, 100, 110, 170, ivory, 0.35);

// bitmap font 5×7 (subset per il titolo OG)
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};
function drawText(str, x0, y0, scale, color) {
  let cx = x0;
  for (const ch of str) {
    const rows = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (rows[r][c] === '1') {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const x = cx + c * scale + dx, y = y0 + r * scale + dy;
              if (x >= 0 && x < W && y >= 0 && y < H) setpx(x, y, color[0], color[1], color[2]);
            }
          }
        }
      }
    }
    cx += 6 * scale;
  }
}
drawText('ALETHE', (W - 6 * 6 * 16) / 2, 320, 16, ivory);
drawText('REALE O NON TORNA?', (W - 18 * 6 * 8) / 2, 490, 8, gold);

// PNG encode (RGB, 8bit)
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  px.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync('og.png', png);
console.log('og.png scritto:', png.length, 'bytes');
