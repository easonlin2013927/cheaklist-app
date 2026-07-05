import { useChecklist } from '../utils/context'

function computeStats(categories) {
  return categories.map(cat => {
    const total = cat.items.length
    const done = cat.items.filter(i => i.done).length
    const pending = total - done
    const rate = total > 0 ? done / total : 0
    const byPriority = {
      high: { total: 0, done: 0 },
      medium: { total: 0, done: 0 },
      low: { total: 0, done: 0 }
    }
    cat.items.forEach(item => {
      byPriority[item.priority].total++
      if (item.done) byPriority[item.priority].done++
    })
    return { ...cat, total, done, pending, rate, byPriority }
  })
}

function CircularProgress({ rate, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - rate)

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--bg-tertiary)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="progress-ring-circle"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--text-primary)"
        fontSize="28"
        fontWeight="700"
      >
        {Math.round(rate * 100)}%
      </text>
    </svg>
  )
}

function BarChart({ stats }) {
  const maxCount = Math.max(...stats.map(s => s.total), 1)

  return (
    <div className="stats-chart">
      {stats.map(cat => (
        <div key={cat.id} className="stats-bar-row">
          <span className="stats-bar-label">{cat.title}</span>
          <div className="stats-bar-track">
            <div
              className="stats-bar-fill"
              style={{ width: `${cat.rate * 100}%` }}
            />
          </div>
          <span className="stats-bar-value">
            {cat.done}/{cat.total}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function StatsModal() {
  const { state, dispatch } = useChecklist()

  if (!state.showStats) return null

  const stats = computeStats(state.categories)
  const totalAll = stats.reduce((s, c) => s + c.total, 0)
  const doneAll = stats.reduce((s, c) => s + c.done, 0)
  const rateAll = totalAll > 0 ? doneAll / totalAll : 0

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_STATS' })}>
      <div className="modal-dialog stats-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">📊 統計</h2>

        {/* Overall completion */}
        <div className="stats-overview">
          <CircularProgress rate={rateAll} />
          <p className="stats-overview-label">
            {doneAll} / {totalAll} 項目已完成
          </p>
        </div>

        {/* Per-category breakdown */}
        {stats.length > 1 && (
          <div className="stats-section">
            <h3 className="stats-section-title">各分類完成率</h3>
            <BarChart stats={stats} />
          </div>
        )}

        {/* Per-category detail */}
        <div className="stats-section">
          <h3 className="stats-section-title">分類詳情</h3>
          {stats.map(cat => (
            <div key={cat.id} className="stats-detail-card">
              <div className="stats-detail-header">
                <span className="stats-detail-name">{cat.title}</span>
                <span className="stats-detail-rate">{Math.round(cat.rate * 100)}%</span>
              </div>
              <div className="stats-detail-bars">
                <div className="stats-detail-bar">
                  <span className="stats-detail-bar-label">待完成</span>
                  <div className="stats-detail-bar-track">
                    <div className="stats-detail-bar-fill pending" style={{ width: `${((cat.pending / (cat.total || 1)) * 100)}%` }} />
                  </div>
                </div>
                <div className="stats-detail-bar">
                  <span className="stats-detail-bar-label">已完成</span>
                  <div className="stats-detail-bar-track">
                    <div className="stats-detail-bar-fill done" style={{ width: `${((cat.done / (cat.total || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="stats-detail-priority">
                <span className="stats-detail-priority-label">優先級：</span>
                <span className="stats-detail-priority-item">
                  <span className="priority-dot priority-dot-high" /> 高: {cat.byPriority.high.done}/{cat.byPriority.high.total}
                </span>
                <span className="stats-detail-priority-item">
                  <span className="priority-dot priority-dot-medium" /> 中: {cat.byPriority.medium.done}/{cat.byPriority.medium.total}
                </span>
                <span className="stats-detail-priority-item">
                  <span className="priority-dot priority-dot-low" /> 低: {cat.byPriority.low.done}/{cat.byPriority.low.total}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-confirm" onClick={() => dispatch({ type: 'TOGGLE_STATS' })}>
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
