import { useState, useRef } from 'react'
import { useChecklist } from '../utils/context'

const CATEGORY_ICONS = ['📝', '🛒', '💼', '🏠', '📚', '✨', '🎯', '📌']

export default function CategoryTabs() {
  const { state, dispatch } = useChecklist()
  const [contextMenu, setContextMenu] = useState(null)
  const menuRef = useRef(null)

  const handleAdd = () => {
    dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })
  }

  const handleEdit = (cat) => {
    dispatch({ type: 'TOGGLE_CATEGORY_MODAL', payload: cat })
    setContextMenu(null)
  }

  const handleDelete = (cat) => {
    if (!confirm(`確定要刪除此分類「${cat.title}」嗎？`)) return
    dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })
    setContextMenu(null)
  }

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setContextMenu(null)
    }
  }

  return (
    <>
      <div className="category-tabs" role="tablist" aria-label="清單分類">
        {state.categories.map((cat, index) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={cat.id === state.activeCategoryId}
            aria-controls={`panel-${cat.id}`}
            className={`category-tab${cat.id === state.activeCategoryId ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_CATEGORY', payload: cat.id })}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, cat })
            }}
            title="右鍵編輯或刪除"
          >
            <span className="category-icon">{CATEGORY_ICONS[index % CATEGORY_ICONS.length]}</span>
            <span className="category-name">{cat.title}</span>
            <span className="category-count">{cat.items.length}</span>
          </button>
        ))}
        <button className="category-tab add-tab" onClick={handleAdd} aria-label="新增分類">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="category-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={handleClickOutside}
        >
          <button
            className="context-menu-item"
            onClick={() => handleEdit(contextMenu.cat)}
          >
            ✏️ 編輯分類
          </button>
          {state.categories.length > 1 && (
            <button
              className="context-menu-item context-menu-item-danger"
              onClick={() => handleDelete(contextMenu.cat)}
            >
              🗑️ 刪除此分類
            </button>
          )}
        </div>
      )}
    </>
  )
}
