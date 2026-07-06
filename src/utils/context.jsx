/**
 * Checklist context and reducer for managing categories, items, and UI state.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { loadCategories, saveCategories, saveTheme } from '../utils/storage'

const ChecklistContext = createContext(null)

const initialState = {
  categories: [],
  activeCategoryId: null,
  themePreference: 'system',
  searchQuery: '',
  showSearch: false,
  showExport: false,
  showStats: false,
  showShare: false,
  showCategoryModal: false,
  editingCategory: null,
  selectedExportFormat: 'txt',
  includeDone: false,
  importedData: null
}

function checklistReducer(state, action) {
  switch (action.type) {
    // ── Hydration ───────────────────────────────────────────────
    case 'HYDRATE':
      return {
        ...state,
        categories: action.payload.categories,
        activeCategoryId: action.payload.activeCategoryId ?? state.activeCategoryId,
        themePreference: action.payload.themePreference ?? state.themePreference
      }

    // ── Categories ──────────────────────────────────────────────
    case 'ADD_CATEGORY': {
      const newCat = { id: Date.now(), title: action.payload || '新清單', items: [] }
      return {
        ...state,
        categories: [...state.categories, newCat],
        activeCategoryId: newCat.id
      }
    }

    case 'DELETE_CATEGORY': {
      const cats = state.categories.filter(c => c.id !== action.payload)
      return {
        ...state,
        categories: cats.length > 0 ? cats : [{ id: Date.now(), title: '清單', items: [] }],
        activeCategoryId: state.activeCategoryId === action.payload
          ? (cats[0]?.id ?? cats[cats.length - 1]?.id)
          : state.activeCategoryId
      }
    }

    case 'UPDATE_CATEGORY': {
      return {
        ...state,
        categories: state.categories.map(c =>
          c.id === action.payload.id ? { ...c, title: action.payload.title } : c
        )
      }
    }

    case 'SET_ACTIVE_CATEGORY':
      return { ...state, activeCategoryId: action.payload }

    // ── Items ───────────────────────────────────────────────────
    case 'ADD_ITEM': {
      const { categoryId, text, priority } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                items: [...cat.items, {
                  id: Date.now(),
                  text,
                  done: false,
                  priority: priority || 'medium',
                  createdAt: Date.now()
                }]
              }
            : cat
        )
      }
    }

    case 'TOGGLE_ITEM': {
      const { categoryId, itemId } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map(item =>
                  item.id === itemId ? { ...item, done: !item.done } : item
                )
              }
            : cat
        )
      }
    }

    case 'DELETE_ITEM': {
      const { categoryId, itemId } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, items: cat.items.filter(i => i.id !== itemId) }
            : cat
        )
      }
    }

    case 'EDIT_ITEM': {
      const { categoryId, itemId, text } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map(item =>
                  item.id === itemId ? { ...item, text } : item
                )
              }
            : cat
        )
      }
    }

    case 'UPDATE_PRIORITY': {
      const { categoryId, itemId, priority } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                items: cat.items.map(item =>
                  item.id === itemId ? { ...item, priority } : item
                )
              }
            : cat
        )
      }
    }

    case 'CLEAR_COMPLETED': {
      const { categoryId } = action.payload
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, items: cat.items.filter(i => !i.done) }
            : cat
        )
      }
    }

    // ── Theme ───────────────────────────────────────────────────
    case 'SET_THEME':
      saveTheme(action.payload)
      return { ...state, themePreference: action.payload }

    // ── Search ──────────────────────────────────────────────────
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }

    case 'TOGGLE_SEARCH':
      return { ...state, showSearch: !state.showSearch }

    case 'CLEAR_SEARCH':
      return { ...state, searchQuery: '', showSearch: false }

    // ── Modals ──────────────────────────────────────────────────
    case 'TOGGLE_EXPORT':
      return { ...state, showExport: !state.showExport }

    case 'TOGGLE_STATS':
      return { ...state, showStats: !state.showStats }

    case 'TOGGLE_SHARE':
      return { ...state, showShare: !state.showShare }

    case 'TOGGLE_CATEGORY_MODAL':
      return {
        ...state,
        showCategoryModal: !state.showCategoryModal,
        editingCategory: action.payload || null
      }

    case 'SET_EXPORT_FORMAT':
      return { ...state, selectedExportFormat: action.payload }

    case 'SET_INCLUDE_DONE':
      return { ...state, includeDone: action.payload }

    // ── Import from share ───────────────────────────────────────
    case 'IMPORT_DATA':
      return {
        ...state,
        importedData: action.payload,
        showShare: true
      }

    // ── Reset import ────────────────────────────────────────────
    case 'RESET_IMPORT':
      return { ...state, importedData: null }

    default:
      return state
  }
}

export function ChecklistProvider({ children }) {
  const [state, dispatch] = useReducer(checklistReducer, initialState)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const data = loadCategories()
    dispatch({ type: 'HYDRATE', payload: data })
  }, [])

  // Persist categories on change
  useEffect(() => {
    if (state.categories.length === 0) return
    saveCategories({
      categories: state.categories,
      activeCategoryId: state.activeCategoryId,
      themePreference: state.themePreference
    })
  }, [state.categories, state.activeCategoryId, state.themePreference])

  // Helper: get active category (prefer stored activeCategoryId, fallback to first)
  const activeCategory = state.categories.find(c => c.id === state.activeCategoryId) || state.categories[0]

  // Helper: get filtered items (search-aware)
  const getFilteredItems = useCallback((categoryId, items) => {
    if (!state.searchQuery) return items
    const q = state.searchQuery.toLowerCase()
    return items.filter(item => item.text.toLowerCase().includes(q))
  }, [state.searchQuery])

  return (
    <ChecklistContext.Provider value={{ state, dispatch, activeCategory, getFilteredItems }}>
      {children}
    </ChecklistContext.Provider>
  )
}

export const useChecklist = () => {
  const ctx = useContext(ChecklistContext)
  if (!ctx) throw new Error('useChecklist must be used within ChecklistProvider')
  return ctx
}

export { ChecklistContext }
