// Generates the app icon set from the real Makan logo — zero dependencies
// (pure PNG decoder + encoder). Run: node scripts/gen-icons.mjs
//
// Source of truth: assets/logo.png (the brand artwork). Everything the browser
// or the shell shows is derived from it, so the favicon, the PWA icons and the
// in-app mark can never drift apart.
import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public', 'icons');
const SOURCE = resolve(ROOT, 'assets', 'logo.png');
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------ PNG decoding */

function decodePng(file) {
  const buf = readFileSync(file);
  let off = 8;
  let ihdr = null;
  const idat = [];
  while (off < buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + length);
    if (type === 'IHDR') {
      ihdr = {
        w: data.readUInt32BE(0),
        h: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + length;
  }
  if (!ihdr) throw new Error('no IHDR — not a PNG');
  if (ihdr.depth !== 8 || ihdr.interlace !== 0) throw new Error('only 8-bit non-interlaced PNGs are supported');

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.color];
  if (!channels) throw new Error(`unsupported colour type ${ihdr.color}`);
  const bpp = channels;
  const stride = ihdr.w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(ihdr.h * stride);

  let p = 0;
  for (let y = 0; y < ihdr.h; y += 1) {
    const filter = raw[p];
    p += 1;
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  // Normalise everything to RGBA so the resampler has one shape to deal with.
  const rgba = Buffer.alloc(ihdr.w * ihdr.h * 4);
  for (let i = 0, j = 0; i < ihdr.w * ihdr.h; i += 1, j += bpp) {
    if (channels === 1) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j];
      rgba[i * 4 + 3] = 255;
    } else if (channels === 2) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j];
      rgba[i * 4 + 3] = out[j + 1];
    } else {
      rgba[i * 4] = out[j];
      rgba[i * 4 + 1] = out[j + 1];
      rgba[i * 4 + 2] = out[j + 2];
      rgba[i * 4 + 3] = channels === 4 ? out[j + 3] : 255;
    }
  }
  return { w: ihdr.w, h: ihdr.h, rgba };
}

/* ------------------------------------------------------------ PNG encoding */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------- resampling */

/**
 * Area-average (box filter) downscale: every destination pixel averages the
 * source pixels it covers, which keeps the glyph's diagonal edges smooth
 * instead of aliasing them the way nearest-neighbour would.
 */
function resample(src, size) {
  const out = Buffer.alloc(size * size * 4);
  const scaleX = src.w / size;
  const scaleY = src.h / size;
  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor(y * scaleY);
    const y1 = Math.max(y0 + 1, Math.min(src.h, Math.ceil((y + 1) * scaleY)));
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.max(x0 + 1, Math.min(src.w, Math.ceil((x + 1) * scaleX)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * src.w + sx) * 4;
          const alpha = src.rgba[i + 3] / 255;
          r += src.rgba[i] * alpha;
          g += src.rgba[i + 1] * alpha;
          b += src.rgba[i + 2] * alpha;
          a += src.rgba[i + 3];
          count += 1;
        }
      }
      const meanAlpha = a / count;
      // Un-premultiply by the alpha mass so edge pixels keep the glyph's own
      // colour instead of a dark halo; the alpha mass doubles as the divisor
      // that turns the per-pixel sums into a mean.
      const weight = a > 0 ? 255 / a : 0;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r * weight);
      out[o + 1] = Math.round(g * weight);
      out[o + 2] = Math.round(b * weight);
      out[o + 3] = Math.round(meanAlpha);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ build */

/** The logo's own field colour, sampled from the artwork (not eyeballed). */
const BRAND = [21, 109, 238]; // #156dee

/**
 * The artwork is a two-tone mark (brand field + white glyph) plus antialiased
 * blends, but the source PNG carries ±1/255 noise across the flat field, which
 * deflate cannot compress away — a flat 192px icon came out at 119 kB. Snapping
 * every pixel back onto the brand→white ramp costs nothing visually and turns
 * the noise into run-length-friendly flat areas.
 */
function snapToRamp(rgba, brand, steps = 24) {
  const d = [255 - brand[0], 255 - brand[1], 255 - brand[2]];
  const len2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  for (let i = 0; i < rgba.length; i += 4) {
    let u = ((rgba[i] - brand[0]) * d[0] + (rgba[i + 1] - brand[1]) * d[1] + (rgba[i + 2] - brand[2]) * d[2]) / len2;
    u = Math.min(1, Math.max(0, u));
    u = Math.round(u * steps) / steps;
    rgba[i] = Math.round(brand[0] + d[0] * u);
    rgba[i + 1] = Math.round(brand[1] + d[1] * u);
    rgba[i + 2] = Math.round(brand[2] + d[2] * u);
  }
  return rgba;
}

/** Centre an already-resized logo on a brand-coloured square canvas. */
function withBackdrop(logo, logoSize, size, bg) {
  const out = Buffer.alloc(size * size * 4);
  const offset = Math.floor((size - logoSize) / 2);
  for (let i = 0; i < size * size; i += 1) {
    out[i * 4] = bg[0];
    out[i * 4 + 1] = bg[1];
    out[i * 4 + 2] = bg[2];
    out[i * 4 + 3] = 255;
  }
  for (let y = 0; y < logoSize; y += 1) {
    for (let x = 0; x < logoSize; x += 1) {
      const s = (y * logoSize + x) * 4;
      const d = ((y + offset) * size + (x + offset)) * 4;
      const alpha = logo[s + 3] / 255;
      for (let c = 0; c < 3; c += 1) {
        out[d + c] = Math.round(logo[s + c] * alpha + bg[c] * (1 - alpha));
      }
      out[d + 3] = 255;
    }
  }
  return out;
}

const source = decodePng(SOURCE);
console.log(`assets/logo.png — ${source.w}×${source.h} — brand #${BRAND.map((c) => c.toString(16).padStart(2, '0')).join('')}`);

const targets = [
  // The in-app mark (header, rail, install sheet) rendered at 30–56px.
  { file: 'makan-192.png', size: 192, bleed: 1 },
  { file: 'icon-192.png', size: 192, bleed: 1 },
  { file: 'icon-512.png', size: 512, bleed: 1 },
  // Maskable icons get cropped to a circle on some launchers, so the artwork is
  // inset into the 80% safe zone and the rest is filled with the brand field.
  { file: 'icon-maskable-512.png', size: 512, bleed: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, bleed: 0.88 },
  { file: 'favicon-64.png', size: 64, bleed: 1 },
];

for (const target of targets) {
  const size = target.size;
  const inner = Math.round(size * target.bleed);
  const logo = snapToRamp(resample(source, inner), BRAND);
  const px = target.bleed === 1 ? logo : withBackdrop(logo, inner, size, BRAND);
  const png = encodePng(size, size, px);
  writeFileSync(resolve(OUT, target.file), png);
  console.log(`${target.file} — ${size}×${size} — ${(png.length / 1024).toFixed(1)} kB`);
}

// Vector favicon: the 64px render, embedded so the icon set has one source.
const faviconPng = encodePng(64, 64, snapToRamp(resample(source, 64), BRAND));
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">
  <image width="64" height="64" href="data:image/png;base64,${faviconPng.toString('base64')}" />
</svg>
`;
writeFileSync(resolve(OUT, 'favicon.svg'), favicon, 'utf8');
console.log(`favicon.svg — ${(favicon.length / 1024).toFixed(1)} kB`);
