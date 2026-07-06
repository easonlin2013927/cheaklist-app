/**
 * Lightweight QR Code generator (Version 1-10, Byte mode).
 * Encodes alphanumeric/byte data into a QR matrix and renders as SVG paths.
 * ~600 lines, zero dependencies.
 */

// ── Reed-Solomon encoder ──────────────────────────────────────

const GF256 = (() => {
  const exp = new Uint8Array(256)
  const log = new Uint8Array(256)
  let x = 1
  for (let i = 0; i < 256; i++) {
    exp[i] = x
    log[x] = i
    x <<= 1
    if (x & 256) x ^= 0x11d
  }
  return { exp, log, mul: (a, b) => a && b ? exp[log[a] + log[b]] : 0 }
})()

function rsEncode(data, nsym) {
  const gen = [1]
  for (let i = 0; i < nsym; i++) {
    const ng = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      ng[j] ^= gen[j]
      ng[j + 1] ^= GF256.mul(gen[j], exp[i])
    }
    gen.length = 0
    gen.push(...ng)
  }

  const ec = new Array(nsym).fill(0)
  for (const b of data) {
    const coef = b ^ ec[0]
    ec.shift()
    for (let i = 0; i < nsym; i++) ec.push(GF256.mul(gen[i + 1] || 0, coef) ^ (ec[i] || 0))
  }
  return ec
}

// ── QR version/ec info ────────────────────────────────────────

const EC_TABLE = [
  // [version][ecLevel] = { totalCodewords, dataCodewords, ecCodewords, interleave }
  // EC levels: L=1, M=0, Q=2, H=3
  // Version 1-10
  null, // dummy v0
  // v1
  [{ dc: 16, ec: 10, inter: 1 }, { dc: 28, ec: 16, inter: 1 }, { dc: 44, ec: 26, inter: 1 }, { dc: 64, ec: 18, inter: 2 }],
  // v2
  [{ dc: 28, ec: 16, inter: 1 }, { dc: 44, ec: 28, inter: 1 }, { dc: 70, ec: 44, inter: 1 }, { dc: 100, ec: 20, inter: 2 }],
  // v3
  [{ dc: 44, ec: 26, inter: 1 }, { dc: 68, ec: 44, inter: 1 }, { dc: 108, ec: 44, inter: 1 }, { dc: 140, ec: 34, inter: 2 }],
  // v4
  [{ dc: 64, ec: 20, inter: 2 }, { dc: 96, ec: 32, inter: 2 }, { dc: 136, ec: 48, inter: 2 }, { dc: 172, ec: 42, inter: 2 }],
  // v5
  [{ dc: 84, ec: 24, inter: 2 }, { dc: 120, ec: 40, inter: 2 }, { dc: 156, ec: 60, inter: 2 }, { dc: 208, ec: 48, inter: 2 }],
  // v6
  [{ dc: 100, ec: 30, inter: 2 }, { dc: 140, ec: 46, inter: 2 }, { dc: 192, ec: 60, inter: 2 }, { dc: 240, ec: 56, inter: 2 }],
  // v7
  [{ dc: 122, ec: 18, inter: 2 }, { dc: 164, ec: 36, inter: 2 }, { dc: 220, ec: 66, inter: 2 }, { dc: 280, ec: 60, inter: 2 }],
  // v8
  [{ dc: 146, ec: 26, inter: 2 }, { dc: 194, ec: 48, inter: 2 }, { dc: 260, ec: 66, inter: 2 }, { dc: 328, ec: 60, inter: 2 }],
  // v9
  [{ dc: 172, ec: 36, inter: 2 }, { dc: 224, ec: 56, inter: 2 }, { dc: 310, ec: 68, inter: 2 }, { dc: 380, ec: 72, inter: 2 }],
  // v10
  [{ dc: 196, ec: 24, inter: 2 }, { dc: 260, ec: 48, inter: 2 }, { dc: 350, ec: 68, inter: 2 }, { dc: 420, ec: 68, inter: 2 }],
]

const EC_LEVELS = { L: 1, M: 0, Q: 2, H: 3 }
const EC_NAMES = ['M', 'L', 'H', 'Q']

// ── Format info bits ──────────────────────────────────────────

const FORMAT_BITS = [
  0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0,
  0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976,
  0x1689, 0x13BE, 0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B,
  0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183, 0x2EDA, 0x2BED,
]

// ── Alignment pattern positions ───────────────────────────────

const ALIGN_POS = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
]

// ── Function pattern placement ────────────────────────────────

function placeFinder(matrix, size, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
      if (r === -1 || r === 7 || c === -1 || c === 7) {
        matrix[rr][cc] = 0 // separator
      } else if (r === 0 || r === 6 || c === 0 || c === 6) {
        matrix[rr][cc] = 1 // outer border
      } else {
        matrix[rr][cc] = 1 // inner fill
      }
    }
  }
}

function placeTimingRows(matrix, size) {
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0
    matrix[i][6] = i % 2 === 0 ? 1 : 0
  }
}

function placeAlignment(matrix, size, version) {
  if (version < 2) return
  const pos = ALIGN_POS[version]
  for (const r of pos) {
    for (const c of pos) {
      if (matrix[r] && matrix[r][c] !== undefined && (matrix[r][c] === 0 || matrix[r][c] === undefined)) {
        // Skip if overlaps timing or finder
        let skip = false
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const rr = r + dr, cc = c + dc
            if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || dr === 0 && dc === 0) {
              matrix[rr]?.[cc] && (matrix[rr][cc] = 1)
            }
          }
        }
      }
    }
  }
  // Proper alignment pattern
  for (const r of pos) {
    for (const c of pos) {
      // Skip positions that overlap with finder/timing
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 8) || (r >= size - 8 && c <= 8)) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const rr = r + dr, cc = c + dc
          if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
            if (matrix[rr] && matrix[rr][cc] !== undefined) matrix[rr][cc] = 1
          }
        }
      }
    }
  }
}

// ── Reserve version info (v7+) ────────────────────────────────
// Version info placed in top-right area, skipped for simplicity in v1-v6
// For v7+, we'd need 6x36 bits. Skipping for byte-mode simplicity.

// ── Place data bits ───────────────────────────────────────────

function placeData(matrix, size, dataBits) {
  const bits = [...dataBits]
  let bitIdx = 0
  let upward = true

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5 // skip timing column

    const rows = upward ? [...Array(size).keys()].reverse() : [...Array(size).keys()]

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (c < 0 || c >= size) continue
        if (matrix[row][c] !== 0 && matrix[row][c] !== undefined) continue
        matrix[row][c] = bits[bitIdx++] || 0
      }
    }

    upward = !upward
  }
}

// ── Masking ───────────────────────────────────────────────────

const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
]

function applyMask(matrix, size, maskNum) {
  const fn = MASK_FNS[maskNum]
  const copy = matrix.map(r => [...r])
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] >= 0 && fn(r, c)) {
        copy[r][c] ^= 1
      }
    }
  }
  return copy
}

// ── Penalty scoring ───────────────────────────────────────────

function penaltyScore(matrix, size) {
  let score = 0

  // Rule 1: consecutive same-color cells in row/column
  for (let r = 0; r < size; r++) {
    let run = 1
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) { run++ }
      else { if (run >= 5) score += run - 2; run = 1 }
    }
    if (run >= 5) score += run - 2
  }
  for (let c = 0; c < size; c++) {
    let run = 1
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) { run++ }
      else { if (run >= 5) score += run - 2; run = 1 }
    }
    if (run >= 5) score += run - 2
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (matrix[r][c] === matrix[r][c + 1] && matrix[r][c] === matrix[r + 1][c] && matrix[r][c] === matrix[r + 1][c + 1]) {
        score += 3
      }
    }
  }

  // Rule 3: finder-like patterns
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let m1 = true, m2 = true
      for (let k = 0; k < 11; k++) {
        if (matrix[r][c + k] !== p1[k]) m1 = false
        if (matrix[r][c + k] !== p2[k]) m2 = false
      }
      if (m1) score += 40
      if (m2) score += 40
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let m1 = true, m2 = true
      for (let k = 0; k < 11; k++) {
        if (matrix[r + k][c] !== p1[k]) m1 = false
        if (matrix[r + k][c] !== p2[k]) m2 = false
      }
      if (m1) score += 40
      if (m2) score += 40
    }
  }

  // Rule 4: proportion of dark cells
  let dark = 0
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (matrix[r][c]) dark++
  const pct = (dark * 100) / (size * size)
  const prev5 = Math.floor(pct / 5) * 5
  const next5 = prev5 + 5
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10

  return score
}

// ── Format info placement ─────────────────────────────────────

function placeFormatInfo(matrix, size, ecLevel, maskNum) {
  const formatIdx = (ecLevel << 3) | maskNum
  const bits = FORMAT_BITS[formatIdx]

  // Around top-left finder
  const positions1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1
    const [r, c] = positions1[i]
    if (r < size && c < size) matrix[r][c] = bit
  }

  // Top-right and bottom-left
  const positions2 = []
  for (let r = size - 1; r >= size - 7; r--) positions2.push([r, 8])
  for (let c = 0; c <= 8; c++) positions2.push([8, c])

  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1
    const [r, c] = positions2[i]
    if (r < size && c < size) matrix[r][c] = bit
  }
}

// ── Main encode ───────────────────────────────────────────────

export function generateQRMatrix(text, ecLevel = 'M') {
  const levelIdx = EC_LEVELS[ecLevel]

  // Determine smallest version that fits
  let version = 1
  for (; version <= 10; version++) {
    const info = EC_TABLE[version][levelIdx]
    const totalBits = info.dc * 8
    const neededBits = 4 + text.length * 8 // mode indicator + char count + data
    if (neededBits <= totalBits) break
  }

  const size = 17 + (version - 1) * 4
  const info = EC_TABLE[version][levelIdx]

  // Build data codewords
  const dataBytes = new TextEncoder().encode(text)
  let bits = [0, 0, 0, 1] // byte mode
  // Char count
  const countBits = version <= 9 ? 8 : 16
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((dataBytes.length >> i) & 1)
  }
  // Data
  for (const b of dataBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1)
    }
  }
  // Terminator
  const terminatorLen = Math.min(4, info.dc * 8 - bits.length)
  for (let i = 0; i < terminatorLen; i++) bits.push(0)
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0)
  // Pad codewords
  const padBytes = [0xEC, 0x11]
  let padIdx = 0
  while (bits.length < info.dc * 8) {
    const pb = padBytes[padIdx % 2]
    for (let i = 7; i >= 0; i--) bits.push((pb >> i) & 1)
    padIdx++
  }

  // Convert to codewords
  const codewords = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0)
    codewords.push(byte)
  }

  // Interleave and add EC
  const interleaved = []
  const ecCount = info.ec
  const dataCount = info.dc
  const interleaveGroups = info.inter

  // Group data codewords
  const groups = []
  for (let g = 0; g < interleaveGroups; g++) {
    const start = Math.floor(g * dataCount / interleaveGroups)
    const end = Math.floor((g + 1) * dataCount / interleaveGroups)
    groups.push(codewords.slice(start, end))
  }

  // Interleave data groups
  let maxGroupLen = 0
  for (const g of groups) if (g.length > maxGroupLen) maxGroupLen = g.length
  for (let i = 0; i < maxGroupLen; i++) {
    for (const g of groups) {
      if (i < g.length) interleaved.push(g[i])
    }
  }

  // EC codewords
  const ecCodewords = rsEncode(codewords.slice(0, dataCount), ecCount)
  for (const ec of ecCodewords) interleaved.push(ec)

  // Convert to bits
  const dataBits = []
  for (const cw of interleaved) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((cw >> i) & 1)
    }
  }

  // Build matrix
  const matrix = Array.from({ length: size }, () => new Array(size).fill(0))

  // Place function patterns
  placeFinder(matrix, size, 0, 0)
  placeFinder(matrix, size, 0, size - 7)
  placeFinder(matrix, size, size - 7, 0)
  placeTimingRows(matrix, size)
  placeAlignment(matrix, size, version)

  // Place data
  placeData(matrix, size, dataBits)

  // Find best mask
  let bestMask = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(matrix, size, mask)
    // Temporarily place format info for scoring
    placeFormatInfo(masked, size, levelIdx, mask)
    const score = penaltyScore(masked, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
    }
  }

  // Apply best mask
  const finalMatrix = applyMask(matrix, size, bestMask)
  placeFormatInfo(finalMatrix, size, levelIdx, bestMask)

  return finalMatrix
}

// ── SVG rendering ─────────────────────────────────────────────

export function qrToSVGPaths(matrix, cellSize = 4, quietZone = 2) {
  const size = matrix.length
  const totalSize = (size + quietZone * 2) * cellSize
  const paths = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c + quietZone) * cellSize
        const y = (r + quietZone) * cellSize
        paths.push(`M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`)
      }
    }
  }

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">${paths.join('')}</svg>`,
    totalSize
  }
}
