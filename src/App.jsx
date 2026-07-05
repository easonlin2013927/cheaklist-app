import { useState, useRef, useEffect } from 'react'
import './App.css'
import { exportItems } from './utils/export'

function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('checklist-items')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('txt')
  const [includeDone, setIncludeDone] = useState(false)
  const inputRef = useRef(null)
  const editRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('checklist-items', JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  useEffect(() => {
    if (!showExport) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowExport(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showExport])

  const openExport = () => setShowExport(true)

  const handleExport = () => {
    exportItems(items, selectedFormat, includeDone)
    setShowExport(false)
  }

  const addItem = () => {
    const text = input.trim()
    if (!text) return
    setItems(prev => [...prev, { id: Date.now(), text, done: false, createdAt: Date.now() }])
    setInput('')
    inputRef.current?.focus()
  }

  const toggleItem = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ))
  }

  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const saveEdit = (id) => {
    const text = editText.trim()
    if (text) {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, text } : item
      ))
    }
    setEditingId(null)
    setEditText('')
  }

  const clearCompleted = () => {
    setItems(prev => prev.filter(item => !item.done))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addItem()
  }

  const total = items.length
  const done = items.filter(i => i.done).length
  const pending = total - done
  const progress = total > 0 ? done / total : 0

  return (
    <div className="app">
      <div className="app-inner">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <h1 className="title">清單</h1>
            {total > 0 && (
              <span className="count-badge">{total}</span>
            )}
          </div>
          <p className="subtitle">
            {pending === 0 && total > 0
              ? '全部完成！🎉'
              : pending > 0 && `${pending} 項待完成`}
          </p>

          {/* Progress bar */}
          {total > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </header>

        {/* Input */}
        <form className="input-area" onSubmit={e => e.preventDefault()}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="新增項目…"
            className="item-input"
            autoComplete="off"
          />
          <button
            type="submit"
            onClick={addItem}
            disabled={!input.trim()}
            className="add-btn"
            aria-label="新增項目"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </form>

        {/* List */}
        {total > 0 ? (
          <div className="item-list">
            {items.map(item => (
              <div key={item.id} className={`list-item ${item.done ? 'done' : ''}`}>
                <button
                  className="check-btn"
                  onClick={() => toggleItem(item.id)}
                  aria-label={item.done ? '標記為未完成' : '標記為完成'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {item.done ? (
                      <polyline points="4 12 9 17 20 6" />
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="8" />
                      </>
                    )}
                  </svg>
                </button>

                {editingId === item.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(item.id)
                      if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                    }}
                    className="edit-input"
                  />
                ) : (
                  <span className="item-text" onDoubleClick={() => startEdit(item)}>
                    {item.text}
                  </span>
                )}

                <div className="item-actions">
                  {!item.done && (
                    <button
                      className="action-btn icon-btn"
                      onClick={() => startEdit(item)}
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
                    onClick={() => deleteItem(item.id)}
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
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="12" y="8" width="56" height="64" rx="8" strokeDasharray="6 4" />
                <line x1="24" y1="24" x2="56" y2="24" />
                <line x1="24" y1="36" x2="50" y2="36" />
                <line x1="24" y1="48" x2="44" y2="48" />
              </svg>
            </div>
            <p className="empty-title">還沒有清單項目</p>
            <p className="empty-desc">在上方輸入框新增你的第一個項目吧！</p>
          </div>
        )}

        {/* Export Modal */}
        {showExport && (
          <div className="modal-overlay" onClick={() => setShowExport(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">匯出清單</h2>

              <fieldset className="modal-fieldset">
                <legend>檔案格式</legend>
                <div className="modal-options">
                  {[
                    { value: 'txt', label: '.txt 純文字' },
                    { value: 'md', label: '.md Markdown' },
                  ].map((opt) => (
                    <label key={opt.value} className="modal-radio">
                      <input
                        type="radio"
                        name="export-format"
                        value={opt.value}
                        checked={selectedFormat === opt.value}
                        onChange={() => setSelectedFormat(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="modal-checkbox">
                <input
                  type="checkbox"
                  checked={includeDone}
                  onChange={(e) => setIncludeDone(e.target.checked)}
                />
                <span>包含已完成項目</span>
              </label>

              <div className="modal-actions">
                <button className="modal-btn modal-btn-cancel" onClick={() => setShowExport(false)}>
                  取消
                </button>
                <button className="modal-btn modal-btn-confirm" onClick={handleExport}>
                  匯出
                </button>
              </div>
            </div>
          </div>
        )}
        <footer className="footer">
          <button onClick={openExport} className="export-btn" aria-label="匯出清單">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            匯出清單
          </button>
          {done > 0 && (
            <button onClick={clearCompleted} className="clear-btn">
              清除已完成項目（{done}）
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

export default App
