import { useState, useRef } from 'react'
import { useChecklist } from '../utils/context'

export default function ItemInput({ categoryId }) {
  const { dispatch } = useChecklist()
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState('medium')
  const inputRef = useRef(null)

  const addItem = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    dispatch({
      type: 'ADD_ITEM',
      payload: { categoryId, text, priority }
    })
    setInput('')
    setPriority('medium')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem(e)
    }
  }

  return (
    <form className="input-area" onSubmit={addItem}>
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
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="priority-select"
        aria-label="優先級"
      >
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
      <button
        type="submit"
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
  )
}
