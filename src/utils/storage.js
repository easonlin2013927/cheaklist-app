/**
 * Storage utilities with migration from legacy flat data model.
 */

const DATA_KEY = 'checklist-data'
const THEME_KEY = 'checklist-theme'
const LEGACY_KEY = 'checklist-items'

export const migrateData = () => {
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy) return null

  try {
    const items = JSON.parse(legacy)
    if (!Array.isArray(items) || items.length === 0) return null

    return {
      categories: [{
        id: Date.now(),
        title: '清單',
        items: items.map(item => ({
          ...item,
          priority: 'medium'
        }))
      }],
      activeCategoryId: null,
      themePreference: 'system'
    }
  } catch {
    return null
  }
}

export const loadCategories = () => {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) return JSON.parse(raw)

    // Migration
    const migrated = migrateData()
    if (migrated) {
      saveCategories(migrated)
      localStorage.removeItem(LEGACY_KEY)
      return migrated
    }

    return {
      categories: [{ id: 1, title: '清單', items: [] }],
      activeCategoryId: 1,
      themePreference: 'system'
    }
  } catch {
    return {
      categories: [{ id: 1, title: '清單', items: [] }],
      activeCategoryId: 1,
      themePreference: 'system'
    }
  }
}

export const saveCategories = (data) => {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
}

export const loadTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'system'
  } catch {
    return 'system'
  }
}

export const saveTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme)
}
