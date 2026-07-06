import { useState, useEffect, useRef } from 'react'
import { useChecklist } from '../utils/context'

const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' }
const PRIORITY_COLORS = {
  high: 'var(--danger)',
  medium: '#ff9500',
  low: 'var(--success)'
}

export default function ListItem({ item, categoryId }) {
  const { dispatch } = useChecklist()
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const editRef = useRef(null)

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  const toggleItem = () => {
    dispatch({ type: 'TOGGLE_ITEM', payload: { categoryId, itemId: item.id } })
  }

  const deleteItem = () => {
    dispatch({ type: 'DELETE_ITEM', payload: { categoryId, itemId: item.id } })
  }

  const startEdit = () => {
    setEditingId(item.id)
    setEditText(item.text)
    setEditPriority(item.priority)
  }

  const saveEdit = () => {
    const text = editText.trim()
    if (text) {
      dispatch({ type: 'EDIT_ITEM', payload: { categoryId, itemId: item.id, text } })
      dispatch({ type: 'UPDATE_PRIORITY', payload: { categoryId, itemId: item.id, priority: editPriority } })
    }
    setEditingId(null)
    setEditText('')
  }

  const cyclePriority = () => {
    const currentIdx = PRIORITIES.indexOf(item.priority)
    const next = PRIORITIES[(currentIdx + 1) % PRIORITIES.length]
    dispatch({ type: 'UPDATE_PRIORITY', payload: { categoryId, itemId: item.id, priority: next } })
  }

  if (editingId === item.id) {
    return (
      <div className={`list-item${item.done ? ' done' : ''}`}>
        <div className="list-item-edit">
          <input
            ref={editRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') { setEditingId(null); setEditText(''); setEditPriority('medium') }
            }}
            className="edit-input"
            aria-label="編輯項目"
          />
          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value)}
            className="edit-priority-select"
            aria-label="編輯優先級"
            onBlur={saveEdit}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className={`list-item${item.done ? ' done' : ''}`} role="listitem">
      <button
        className="check-btn"
        onClick={toggleItem}
        aria-label={item.done ? '標記為未完成' : '標記為完成'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {item.done ? (
            <polyline points="4 12 9 17 20 6" />
          ) : (
            <circle cx="12" cy="12" r="8" />
          )}
        </svg>
      </button>

      {/* Priority dot */}
      <button
        className="priority-dot"
        style={{ '--priority-color': PRIORITY_COLORS[item.priority] }}
        onClick={cyclePriority}
        aria-label={`優先級：${PRIORITY_LABELS[item.priority]}（點擊切換）`}
        title={`優先級：${PRIORITY_LABELS[item.priority]}`}
        tabIndex={item.done ? -1 : 0}
      >
        <span className="priority-dot-inner" />
      </button>

      <div className="list-item-content">
        <span
          className="item-text"
          onDoubleClick={startEdit}
        >
          {item.text}
        </span>
      </div>

      <div className="item-actions">
        {!item.done && (
          <button
            className="action-btn icon-btn"
            onClick={startEdit}
            aria-label="編輯"
            title="編輯"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <button
          className="action-btn icon-btn danger"
          onClick={deleteItem}
          aria-label="刪除"
          title="刪除"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
