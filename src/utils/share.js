/**
 * Share utilities — encode/decode checklist data for URL sharing.
 * Uses RFC 4648 Base64 (URL-safe) for CJK character support.
 */

// Encode UTF-8 bytes to URL-safe Base64 (no padding)
export const encodeBase64 = (str) => {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Decode URL-safe Base64 to UTF-8 string
export const decodeBase64 = (base64) => {
  // Restore standard Base64 chars and padding
  let s = base64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - s.length % 4) % 4
  s += '='.repeat(pad)
  try {
    const binary = atob(s)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export const encodeShareData = (categories) => {
  try {
    const json = JSON.stringify({ categories })
    return encodeBase64(json)
  } catch {
    return null
  }
}

export const decodeShareData = (base64) => {
  try {
    const json = decodeBase64(base64)
    if (!json) return null
    const data = JSON.parse(json)
    if (data && Array.isArray(data.categories)) {
      return data
    }
    return null
  } catch {
    return null
  }
}

export const getShareUrl = (base64) => {
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?share=${base64}`
}

export const checkForSharedData = () => {
  const params = new URLSearchParams(window.location.search)
  const share = params.get('share')
  if (share) {
    return decodeShareData(share)
  }
  return null
}
