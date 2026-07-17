import { useEffect, useRef } from 'react'
import './App.css'
import { ChecklistProvider, useChecklist } from './utils/context'
import { checkForSharedData } from './utils/share'
import CategoryTabs from './components/CategoryTabs'
import SearchBar from './components/SearchBar'
import ThemeToggle from './components/ThemeToggle'
import ItemInput from './components/ItemInput'
import ListItem from './components/ListItem'
import CategoryModal from './components/CategoryModal'
import StatsModal from './components/StatsModal'
import ShareModal from './components/ShareModal'

function App() {
  return (
    <ChecklistProvider>
      <div className="app">
        <div className="app-inner">
          <AppContent />
        </div>
      </div>
    </ChecklistProvider>
  )
}

function AppContent() {
  const { state, dispatch, activeCategory, getFilteredItems } = useChecklist()
  const hasImported = useRef(false)

  // Check for shared data on mount
  useEffect(() => {
    if (hasImported.current) return
    hasImported.current = true
    const shared = checkForSharedData()
    if (shared) {
      dispatch({ type: 'IMPORT_DATA', payload: shared })
    }
  }, [])

  const items = activeCategory ? activeCategory.items : []
  const filteredItems = getFilteredItems(activeCategory?.id, items)
  const total = items.length
  const done = items.filter(i => i.done).length
  const pending = total - done
  const progress = total > 0 ? done / total : 0

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <h1 className="title">
            {activeCategory ? activeCategory.title : '清單'}
          </h1>
          {total > 0 && (
            <span className="count-badge">{total}</span>
          )}
          <ThemeToggle />
          <button
            className="header-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_STATS' })}
            aria-label="統計"
            title="統計"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
              <rect x="3" y="12" width="4" height="9" rx="1" />
              <rect x="10" y="6" width="4" height="15" rx="1" />
              <rect x="17" y="3" width="4" height="18" rx="1" />
            </svg>
          </button>
          <button
            className="header-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_SEARCH' })}
            aria-label="搜尋"
            title="搜尋"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
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

      {/* Category tabs */}
      <CategoryTabs />

      {/* Search bar */}
      <SearchBar />

      {/* Input */}
      {activeCategory && (
        <ItemInput categoryId={activeCategory.id} />
      )}

      {/* List */}
      {activeCategory && (
        <>
          {filteredItems.length > 0 ? (
            <div className="item-list" role="list">
              {filteredItems.map(item => (
                <ListItem key={item.id} item={item} categoryId={activeCategory.id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {state.searchQuery ? (
                <>
                  <p className="empty-title">沒有找到符合「{state.searchQuery}」的項目</p>
                  <p className="empty-desc">試試其他關鍵字</p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Share/Export Modal */}
      {state.showShare && (
        <ShareModal />
      )}

      <footer className="footer">
        <div className="footer-actions">
          <button onClick={() => dispatch({ type: 'TOGGLE_SHARE' })} className="export-btn" aria-label="分享與匯出">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            分享與匯出
          </button>
          {done > 0 && (
            <button
              onClick={() => activeCategory && dispatch({ type: 'CLEAR_COMPLETED', payload: { categoryId: activeCategory.id } })}
              className="clear-btn"
            >
              清除已完成（{done}）
            </button>
          )}
        </div>
      </footer>

      {/* Modals */}
      <CategoryModal />
      <StatsModal />
    </>
  )
}

export default App
