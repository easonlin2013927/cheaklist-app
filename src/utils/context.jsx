/**
 * Checklist context and reducer with cloud sync support.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { api } from './api'

const ChecklistContext = createContext(null)

const DEFAULT_DATA = {
  categories: [{ id: 1, title: '皜', items: [] }],
  activeCategoryId: 1,
  themePreference: 'system'
}

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
  importedData: null,
  syncing: false,
  syncError: null
}

function checklistReducer(state, action) {
  switch (action.type) {
    case 'SYNC_START':
      return { ...state, syncing: true, syncError: null }

    case 'SYNC_END':
      return { ...state, syncing: false }

    case 'SYNC_ERROR':
      return { ...state, syncing: false, syncError: action.payload }

    case 'HYDRATE':
      return {
        ...state,
        categories: action.payload.categories,
        activeCategoryId: action.payload.activeCategoryId ?? state.activeCategoryId,
        themePreference: action.payload.themePreference ?? state.themePreference
      }

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
        categories: cats.length > 0 ? cats : [{ id: Date.now(), title: '皜', items: [] }],
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

    case 'SET_THEME':
      return { ...state, themePreference: action.payload }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }

    case 'TOGGLE_SEARCH':
      return { ...state, showSearch: !state.showSearch }

    case 'CLEAR_SEARCH':
      return { ...state, searchQuery: '', showSearch: false }

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

    case 'IMPORT_DATA':
      return {
        ...state,
        importedData: action.payload,
        showShare: true
      }

    case 'RESET_IMPORT':
      return { ...state, importedData: null }

    default:
      return state
  }
}

let syncTimer = null

function debouncedSync(state, saveFn) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    try {
      await saveFn(state)
    } catch {
      // Sync errors handled by UI
    }
  }, 1000)
}

export function ChecklistProvider({ children }) {
  const [state, dispatch] = useReducer(checklistReducer, initialState)

  // Hydrate from cloud on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getData()
        dispatch({ type: 'HYDRATE', payload: data })
      } catch {
        // Use defaults
        dispatch({ type: 'HYDRATE', payload: DEFAULT_DATA })
      }
    }
    load()
  }, [])

  // Persist to cloud on change
  useEffect(() => {
    if (state.categories.length === 0) return
    debouncedSync(state, api.saveData)
  }, [state.categories, state.activeCategoryId, state.themePreference])

  const activeCategory = state.categories.find(c => c.id === state.activeCategoryId) || state.categories[0]

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

