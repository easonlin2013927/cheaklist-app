/**
 * Theme utilities — manages system/light/dark theme with CSS variable updates.
 */

const THEME_KEY = 'checklist-theme'

// Resolve the effective theme value
export function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

// Apply theme to document
export function applyTheme(theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark')
  } else {
    html.setAttribute('data-theme', 'light')
  }
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
  }
}

// Listen for system theme changes
export function setupThemeListener(onChange) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
