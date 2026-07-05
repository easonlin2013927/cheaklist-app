import { useChecklist } from '../utils/context'
import { useState, useRef, useEffect } from 'react'

export default function SearchBar() {
  const { state, dispatch } = useChecklist()
  const [localQuery, setLocalQuery] = useState(state.searchQuery)
  const inputRef = useRef(null)

  useEffect(() => {
    if (state.showSearch && inputRef.current) {
      inputRef.current.focus()
    }
  }, [state.showSearch])

  useEffect(() => {
    setLocalQuery(state.searchQuery)
  }, [state.searchQuery])

  const handleChange = (e) => {
    const val = e.target.value
    setLocalQuery(val)
    dispatch({ type: 'SET_SEARCH_QUERY', payload: val })
  }

  const handleClear = () => {
    dispatch({ type: 'CLEAR_SEARCH' })
  }

  if (!state.showSearch) return null

  return (
    <div className="search-bar" role="search">
      <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={handleChange}
        placeholder="搜尋清單項目…"
        className="search-input"
        aria-label="搜尋清單項目"
      />
      {localQuery && (
        <button className="search-clear" onClick={handleClear} aria-label="清除搜尋">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
