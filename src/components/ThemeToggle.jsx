import { useChecklist } from '../utils/context'

const THEMES = [
  { value: 'system', label: '跟随系統', icon: '🖥️' },
  { value: 'light', label: '淺色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
]

export default function ThemeToggle() {
  const { state, dispatch } = useChecklist()

  const current = THEMES.find(t => t.value === state.themePreference) || THEMES[0]

  const cycleTheme = () => {
    const idx = THEMES.findIndex(t => t.value === state.themePreference)
    const next = THEMES[(idx + 1) % THEMES.length]
    dispatch({ type: 'SET_THEME', payload: next.value })
  }

  return (
    <div className="theme-toggle-wrapper">
      <button
        className="theme-toggle-btn"
        onClick={cycleTheme}
        title={`主題：${current.label}（點擊切換）`}
        aria-label={`切換主題，目前 ${current.label}`}
      >
        {current.icon}
      </button>
      <div className="theme-dropdown">
        {THEMES.map(t => (
          <button
            key={t.value}
            className={`theme-option${state.themePreference === t.value ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_THEME', payload: t.value })}
            aria-pressed={state.themePreference === t.value}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
