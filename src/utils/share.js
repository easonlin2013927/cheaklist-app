/**
 * Share utilities — encode/decode checklist data for URL sharing.
 */

export const encodeShareData = (categories) => {
  try {
    const json = JSON.stringify({ categories })
    const bytes = new TextEncoder().encode(json)
    const base64 = btoa(String.fromCharCode(...bytes))
    return base64
  } catch {
    return null
  }
}

export const decodeShareData = (base64) => {
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
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
  return `${baseUrl}?share=${encodeURIComponent(base64)}`
}

export const checkForSharedData = () => {
  const params = new URLSearchParams(window.location.search)
  const share = params.get('share')
  if (share) {
    return decodeShareData(share)
  }
  return null
}
