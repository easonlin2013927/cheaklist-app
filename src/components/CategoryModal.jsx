import { useState, useEffect, useRef } from 'react'
import { useChecklist } from '../utils/context'

export default function CategoryModal() {
  const { state, dispatch } = useChecklist()
  const [title, setTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (state.showCategoryModal) {
      if (state.editingCategory) {
        setTitle(state.editingCategory.title)
      } else {
        setTitle('')
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [state.showCategoryModal])

  if (!state.showCategoryModal) return null

  const handleSave = () => {
    const trimmed = title.trim()
    if (!trimmed) return

    if (state.editingCategory) {
      dispatch({
        type: 'UPDATE_CATEGORY',
        payload: { id: state.editingCategory.id, title: trimmed }
      })
    } else {
      dispatch({ type: 'ADD_CATEGORY', payload: trimmed })
    }
    dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })
  }

  const handleDelete = () => {
    if (!state.editingCategory) return
    if (!confirm('確定要刪除此分類嗎？')) return
    dispatch({ type: 'DELETE_CATEGORY', payload: state.editingCategory.id })
    dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {state.editingCategory ? '編輯分類' : '新增分類'}
        </h2>

        <label className="modal-label" style={{ marginBottom: '16px', display: 'block' }}>
          <span className="modal-label-text">分類名稱</span>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })
            }}
            placeholder="輸入分類名稱…"
            className="modal-input"
            maxLength={20}
          />
        </label>

        {state.editingCategory && (
          <button className="modal-delete-btn" onClick={handleDelete}>
            刪除此分類
          </button>
        )}

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={() => dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })}
          >
            取消
          </button>
          <button
            className="modal-btn modal-btn-confirm"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            {state.editingCategory ? '儲存' : '新增'}
          </button>
        </div>
      </div>
    </div>
  )
}
