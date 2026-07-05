/**
 * Export utilities for checklist items.
 * Generates .txt, .csv, .md, .docx (Word), and .xlsx (Excel) files.
 */

const formatDate = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const formatFilename = (ext) => `清單-${formatDate()}.${ext}`

const filterItems = (items, includeDone) =>
  includeDone ? items : items.filter((i) => !i.done)

// ── Generators ────────────────────────────────────────────────

const generateTXT = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const title = `清單 (${formatDate()})`
  const lines = [
    title,
    `匯出日期：${formatDate()}`,
    `總項數：${filtered.length}`,
    '',
    ...filtered.map(
      (item) =>
        `${item.done ? '[x]' : '[ ]'} ${item.text}`
    ),
  ]
  return lines.join('\n') + '\n'
}

const generateCSV = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const escape = (val) => {
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const rows = [
    ['項目', '完成狀態'],
    ...filtered.map((item) => [item.text, item.done ? '是' : '否']),
  ]
  return rows.map((row) => row.map(escape).join(',')).join('\n') + '\n'
}

const generateMD = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const title = `# 清單 (${formatDate()})\n\n匯出日期：${formatDate()}\n`
  const list = filtered
    .map((item) => `${item.done ? '- [x]' : '- [ ]'} ${item.text}`)
    .join('\n')
  return title + '\n' + list + '\n'
}

// ── Minimal OOXML helpers ─────────────────────────────────────
// These create a proper ZIP-like blob using JSZip-free approach:
// We build a real .docx / .xlsx using the Blob API with raw ZIP bytes.

/**
 * Create a minimal ZIP file from key-value pairs of (filename -> Uint8Array).
 * Uses the ZIP format spec (no external deps).
 */
function createZipBlob(entries) {
  // Phase 1: Build central directory and compute offsets
  const fileEntries = []
  let offset = 0
  const encoder = new TextEncoder()

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name)
    const contentBytes = typeof content === 'string' ? encoder.encode(content) : content

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length + contentBytes.length)
    localHeader.set([0x50, 0x4b, 0x03, 0x04], 0) // signature
    localHeader.set([20, 0], 4) // version needed
    localHeader.set([0, 0], 6) // flags
    localHeader.set([0, 0], 8) // compression (store)
    localHeader.set([0, 0, 0, 0], 10) // mod time
    localHeader.set([0, 0, 0, 0], 14) // mod date
    const crc = crc32(contentBytes)
    localHeader.set([crc & 0xff, (crc >> 8) & 0xff, (crc >> 16) & 0xff, (crc >> 24) & 0xff], 14)
    localHeader.set([contentBytes.length & 0xff, (contentBytes.length >> 8) & 0xff, (contentBytes.length >> 16) & 0xff, (contentBytes.length >> 24) & 0xff], 18)
    localHeader.set([0, 0, 0, 0], 22) // compressed size same as size for stored
    localHeader.set([nameBytes.length & 0xff, (nameBytes.length >> 8) & 0xff], 26)
    localHeader.set(nameBytes, 30)
    localHeader.set(contentBytes, 30 + nameBytes.length)

    fileEntries.push({ name, nameBytes, contentBytes, localHeader, crc, offset })
    offset += localHeader.length
  }

  // Phase 2: Central directory
  let cdOffset = offset
  const cdEntries = []
  for (const fe of fileEntries) {
    const cdEntry = new Uint8Array(46 + fe.nameBytes.length)
    cdEntry.set([0x50, 0x4b, 0x01, 0x02], 0) // central dir signature
    cdEntry.set([20, 0], 4) // version made by
    cdEntry.set([20, 0], 6) // version needed
    cdEntry.set([0, 0], 8) // flags
    cdEntry.set([0, 0], 10) // compression
    cdEntry.set([0, 0, 0, 0], 12) // mod time
    cdEntry.set([0, 0, 0, 0], 16) // mod date
    cdEntry.set([fe.crc & 0xff, (fe.crc >> 8) & 0xff, (fe.crc >> 16) & 0xff, (fe.crc >> 24) & 0xff], 16)
    cdEntry.set([fe.contentBytes.length & 0xff, (fe.contentBytes.length >> 8) & 0xff, (fe.contentBytes.length >> 16) & 0xff, (fe.contentBytes.length >> 24) & 0xff], 20)
    cdEntry.set([fe.contentBytes.length & 0xff, (fe.contentBytes.length >> 8) & 0xff, (fe.contentBytes.length >> 16) & 0xff, (fe.contentBytes.length >> 24) & 0xff], 24)
    cdEntry.set([fe.nameBytes.length & 0xff, (fe.nameBytes.length >> 8) & 0xff], 28)
    cdEntry.set([0, 0, 0, 0], 30) // disk number
    cdEntry.set([0, 0], 34) // internal attrs
    cdEntry.set([0, 0, 0, 0], 36) // external attrs
    cdEntry.set([fe.offset & 0xff, (fe.offset >> 8) & 0xff, (fe.offset >> 16) & 0xff, (fe.offset >> 24) & 0xff], 42)
    cdEntry.set(fe.nameBytes, 46)
    cdEntries.push(cdEntry)
  }

  const cdSize = cdEntries.reduce((s, e) => s + e.length, 0)
  const cdTotal = cdSize + cdEntries.reduce((s, e) => s + e.length, 0)

  // Phase 3: End of central directory record
  const eocd = new Uint8Array(22)
  eocd.set([0x50, 0x4b, 0x05, 0x06], 0)
  eocd.set([0, 0, 0, 0], 4) // disk numbers
  eocd.set([fileEntries.length & 0xff, (fileEntries.length >> 8) & 0xff], 8)
  eocd.set([fileEntries.length & 0xff, (fileEntries.length >> 8) & 0xff], 10)
  eocd.set([cdSize & 0xff, (cdSize >> 8) & 0xff, (cdSize >> 16) & 0xff, (cdSize >> 24) & 0xff], 12)
  eocd.set([cdOffset & 0xff, (cdOffset >> 8) & 0xff, (cdOffset >> 16) & 0xff, (cdOffset >> 24) & 0xff], 16)
  eocd.set([0, 0], 20) // comment length

  // Concatenate all parts
  const totalSize = offset + cdSize + 22
  const result = new Uint8Array(totalSize)
  let pos = 0
  for (const fe of fileEntries) {
    result.set(fe.localHeader, pos)
    pos += fe.localHeader.length
  }
  for (const cd of cdEntries) {
    result.set(cd, pos)
    pos += cd.length
  }
  result.set(eocd, pos)

  return new Blob([result], { type: 'application/octet-stream' })
}

/** Compute CRC32 */
function crc32(data) {
  let crc = 0xFFFFFFFF
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })())
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** Generate a proper .docx file using OOXML */
const generateDOCX = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const dateStr = formatDate()

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`

  const listItems = filtered
    .map((item) => {
      const bullet = item.done ? '&#x2611; ' : '&#x2610; '
      const style = item.done ? 'text-decoration: line-through; color: #999;' : ''
      return `<w:p><w:r><w:t xml:space="preserve">${bullet}</w:t></w:r><w:r><w:t>${escapeXml(item.text)}</w:t></w:r></w:p>`
    })
    .join('')

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t xml:space="preserve">清單 (${dateStr})</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">匯出日期：${dateStr}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">總項數：${filtered.length}</w:t></w:r></w:p>
    ${listItems}
  </w:body>
</w:document>`

  const [docxBlob] = buildDocx([
    ['[Content_Types].xml', contentTypesXml],
    ['_rels/.rels', relsXml],
    ['word/_rels/document.xml.rels', wordRelsXml],
    ['word/document.xml', documentXml],
  ])

  return { blob: docxBlob, filename: formatFilename('docx'), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildDocx(entries) {
  return entries.map(([name, content]) => {
    const encoder = new TextEncoder()
    return [name, encoder.encode(content)]
  })
}

/** Generate a proper .xlsx file using OOXML */
const generateXLSX = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const dateStr = formatDate()

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="清單" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`

  // Build shared strings for item texts
  const sharedStrings = filtered.map(item => item.text)
  const ssEntries = sharedStrings.map(s => escapeXml(s))
  let ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ssEntries.length}" uniqueCount="${ssEntries.length}">`
  ssEntries.forEach(s => { ssXml += `<si><t>${s}</t></si>` })
  ssXml += '</sst>'

  // Build worksheet
  let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>`

  // Header row
  sheetXml += `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>`

  // Data rows (skip header in shared strings)
  filtered.forEach((item, idx) => {
    const row = idx + 2
    const textIdx = idx + 2 // +2 because 0=header1, 1=header2
    sheetXml += `<row r="${row}"><c r="A${row}" t="s"><v>${textIdx}</v></c>`
    sheetXml += `<c r="B${row}" t="inlineStr"><is><t>${item.done ? '是' : '否'}</t></is></c></row>`
  })

  sheetXml += `</sheetData></worksheet>`

  const [xlsxBlob] = buildXlsx([
    ['[Content_Types].xml', contentTypesXml],
    ['_rels/.rels', relsXml],
    ['xl/_rels/workbook.xml.rels', workbookRelsXml],
    ['xl/workbook.xml', workbookXml],
    ['xl/sharedStrings.xml', ssXml],
    ['xl/worksheets/sheet1.xml', sheetXml],
  ])

  return { blob: xlsxBlob, filename: formatFilename('xlsx'), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
}

function buildXlsx(entries) {
  const zipEntries = entries.map(([name, content]) => {
    const encoder = new TextEncoder()
    return [name, encoder.encode(content)]
  })
  const blob = createZipBlob(zipEntries)
  return [blob]
}

// ── Shared download helper ────────────────────────────────────

const MIME_MAP = {
  txt: 'text/plain;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
}

const EXT_MAP = {
  txt: 'txt',
  csv: 'csv',
  md: 'md',
  docx: 'docx',
  xlsx: 'xlsx',
}

const GENERATORS = {
  txt: generateTXT,
  csv: generateCSV,
  md: generateMD,
}

const downloadBlob = (blob, filename, mimeType) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportItems = (items, format, includeDone) => {
  // Handle OOXML formats (docx, xlsx) which return a Blob
  if (format === 'docx') {
    const result = generateDOCX(items, includeDone)
    downloadBlob(result.blob, result.filename, result.mime)
    return
  }

  if (format === 'xlsx') {
    const result = generateXLSX(items, includeDone)
    downloadBlob(result.blob, result.filename, result.mime)
    return
  }

  // Handle text-based formats (txt, csv, md)
  const generator = GENERATORS[format]
  if (!generator) return

  const content = generator(items, includeDone)
  const ext = EXT_MAP[format]
  const mime = MIME_MAP[format]
  const filename = formatFilename(ext)
  const blob = new Blob([content], { type: mime })
  downloadBlob(blob, filename, mime)
}
