// Generates the PWA PNG icons with no external dependencies, using Node's
// built-in zlib to encode a PNG. Draws a simple volt barbell on an ink square.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// Rack palette: charcoal background (#0B0B0D) + volt lime (#D6FF3F)
const INK = [11, 11, 13, 255]
const VOLT = [214, 255, 63, 255]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // rows prefixed with filter byte 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeIcon(size, { bleed = false } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    buf[i] = c[0]
    buf[i + 1] = c[1]
    buf[i + 2] = c[2]
    buf[i + 3] = c[3]
  }
  const radius = bleed ? 0 : size * 0.22
  // Background (rounded square unless maskable bleed).
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true
      if (radius > 0) {
        const cx = Math.min(x, size - 1 - x)
        const cy = Math.min(y, size - 1 - y)
        if (cx < radius && cy < radius) {
          const dx = radius - cx
          const dy = radius - cy
          inside = dx * dx + dy * dy <= radius * radius
        }
      }
      set(x, y, inside ? INK : [0, 0, 0, 0])
    }
  }
  // Barbell: bar + inner plates + outer plates.
  const rect = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, VOLT)
  }
  const S = size
  rect(Math.round(0.31 * S), Math.round(0.47 * S), Math.round(0.38 * S), Math.round(0.06 * S))
  rect(Math.round(0.28 * S), Math.round(0.33 * S), Math.round(0.07 * S), Math.round(0.34 * S))
  rect(Math.round(0.65 * S), Math.round(0.33 * S), Math.round(0.07 * S), Math.round(0.34 * S))
  rect(Math.round(0.19 * S), Math.round(0.38 * S), Math.round(0.06 * S), Math.round(0.24 * S))
  rect(Math.round(0.75 * S), Math.round(0.38 * S), Math.round(0.06 * S), Math.round(0.24 * S))
  return encodePng(size, size, buf)
}

writeFileSync(join(OUT, 'icon-192.png'), makeIcon(192))
writeFileSync(join(OUT, 'icon-512.png'), makeIcon(512))
writeFileSync(join(OUT, 'icon-512-maskable.png'), makeIcon(512, { bleed: true }))
writeFileSync(join(OUT, 'apple-touch-icon.png'), makeIcon(180))
console.log('Generated PWA icons in public/icons')
