/**
 * Export utilities for checklist items.
 * Generates .txt and .md files.
 */

const formatDate = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const formatFilename = (ext) => `清單-${formatDate()}.${ext}`

const filterItems = (items, includeDone) =>
  includeDone ? items : items.filter((i) => !i.done)

const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' }

const generateTXT = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const lines = [
    ...filtered.map(
      (item) =>
        `${item.done ? '[x]' : '[ ]'} ${item.text}${item.priority !== 'medium' ? ` [${PRIORITY_LABELS[item.priority]}]` : ''}`
    ),
  ]
  return lines.join('\n') + '\n'
}

const generateMD = (items, includeDone) => {
  const filtered = filterItems(items, includeDone)
  const list = filtered
    .map((item) => {
      const prefix = `${item.done ? '- [x]' : '- [ ]'} ${item.text}`
      if (item.priority !== 'medium') {
        return `${prefix} *(${PRIORITY_LABELS[item.priority]})*`
      }
      return prefix
    })
    .join('\n')
  return list + '\n'
}

const MIME_MAP = {
  txt: 'text/plain;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
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

export const exportItems = (categories, format, includeDone) => {
  const generator = { txt: generateTXT, md: generateMD }[format]
  if (!generator) return

  let content = ''
  if (categories.length === 1) {
    content = `# 清單 (${formatDate()})\n\n` + generator(categories[0].items, includeDone)
  } else {
    // Multi-category export
    const parts = categories.map(cat => {
      const filtered = filterItems(cat.items, includeDone)
      if (filtered.length === 0) return ''
      return `## ${cat.title}\n\n${generator(filtered, true)}\n`
    }).filter(Boolean)
    content = `# 清單 (${formatDate()})\n\n` + parts.join('\n')
  }

  const ext = format
  const mime = MIME_MAP[format]
  const filename = formatFilename(ext)
  const blob = new Blob([content], { type: mime })
  downloadBlob(blob, filename, mime)
}
