import { useChecklist } from '../utils/context'

const CATEGORY_ICONS = ['📝', '🛒', '💼', '🏠', '📚', '✨', '🎯', '📌']

export default function CategoryTabs() {
  const { state, dispatch } = useChecklist()

  const handleAdd = () => {
    dispatch({ type: 'TOGGLE_CATEGORY_MODAL' })
  }

  return (
    <div className="category-tabs" role="tablist" aria-label="清單分類">
      {state.categories.map((cat, index) => (
        <button
          key={cat.id}
          role="tab"
          aria-selected={cat.id === state.activeCategoryId}
          aria-controls={`panel-${cat.id}`}
          className={`category-tab${cat.id === state.activeCategoryId ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_CATEGORY', payload: cat.id })}
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
  )
}
