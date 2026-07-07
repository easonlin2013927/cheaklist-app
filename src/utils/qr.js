/**
 * QR Code generator using qrcode-generator library.
 * Renders the QR matrix as an SVG.
 */

import QRCode from 'qrcode-generator'

export function generateQRMatrix(text, size = 17) {
  // Auto-detect best version
  const qr = QRCode(0, 'L')
  qr.addData(text)
  qr.make()
  return qr
}

export function qrToSVG(qr, cellSize = 4, quietZone = 2, darkColor = '#1d1d1f', lightColor = '#ffffff') {
  const modules = qr.getModuleCount()
  const totalSize = (modules + quietZone * 2) * cellSize

  const paths = []
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) {
        const x = (col + quietZone) * cellSize
        const y = (row + quietZone) * cellSize
        paths.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${darkColor}"/>`)
      }
    }
  }

  // Always draw a white background rect so QR is scannable on any page background
  paths.unshift(`<rect width="${totalSize}" height="${totalSize}" fill="${lightColor}"/>`)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">${paths.join('')}</svg>`
  return { svg, totalSize }
}
