import { useState, useEffect, useRef } from 'react'
import { useChecklist } from '../utils/context'
import { encodeShareData, getShareUrl } from '../utils/share'
import { generateQRMatrix, qrToSVG } from '../utils/qr'
import { exportItems } from '../utils/export'

export default function ShareModal() {
  const { state, dispatch } = useChecklist()
  const [shareUrl, setShareUrl] = useState('')
  const [qrSvg, setQrSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('txt')
  const [includeDone, setIncludeDone] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!state.showShare) return
    try {
      const data = encodeShareData(state.categories)
      if (data) {
        const url = getShareUrl(data)
        setShareUrl(url)
        const qr = generateQRMatrix(url)
        // Detect dark mode and set QR colors accordingly
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
          window.matchMedia('(prefers-color-scheme: dark)').matches
        const { svg } = qrToSVG(qr, 4, 2, isDark ? '#ffffff' : '#1d1d1f', isDark ? '#000000' : '#ffffff')
        setQrSvg(svg)
      }
    } catch (err) {
      console.error('QR generation failed:', err)
      setShareUrl('編碼失敗，請重試')
    }
  }, [state.showShare, state.categories])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!state.showShare) return null

  const setCopiedState = () => {
    setCopied(true)
    setShowSuccess(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCopied(false)
      setShowSuccess(false)
    }, 2000)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedState()
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedState()
    }
  }

  const handleCopyText = async () => {
    try {
      // Generate plain text version of all categories
      const parts = state.categories.map(cat => {
        if (cat.items.length === 0) return `### ${cat.title}\n(空清單)`
        const items = includeDone
          ? cat.items
          : cat.items.filter(i => !i.done)
        const lines = items.map(item =>
          `${item.done ? '[x]' : '[ ]'} ${item.text}`
        ).join('\n')
        return `### ${cat.title}\n${lines}`
      })
      const text = parts.join('\n\n')
      await navigator.clipboard.writeText(text)
      setCopiedState()
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      const parts = state.categories.map(cat => {
        const items = includeDone
          ? cat.items
          : cat.items.filter(i => !i.done)
        const lines = items.map(item =>
          `${item.done ? '[x]' : '[ ]'} ${item.text}`
        ).join('\n')
        return `### ${cat.title}\n${lines}`
      })
      textarea.value = parts.join('\n\n')
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedState()
    }
  }

  const handleExport = () => {
    exportItems(state.categories, selectedFormat, includeDone)
  }

  // Try Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: '清單分享',
        text: shareUrl,
        url: shareUrl
      })
    } catch {
      // User cancelled or share failed — nothing to do
    }
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_SHARE' })}>
      <div className="modal-dialog share-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">分享與匯出</h2>

        {/* Success toast */}
        {showSuccess && (
          <div className="copy-success-toast">
            ✓ 已複製到剪貼簿
          </div>
        )}

        {/* QR Code */}
        {qrSvg && (
          <div className="qr-code-container">
            <div
              className="qr-code-svg"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="qr-code-label">掃描 QR Code 查看清單</p>
          </div>
        )}

        {/* Share URL */}
        <p className="share-desc">複製以下連結，分享給其他人查看這份清單：</p>
        <div className="share-url-row">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="share-url-input"
            aria-label="分享連結"
          />
          <button
            className={`share-copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopyLink}
            aria-label={copied ? '已複製' : '複製連結'}
          >
            {copied ? '✓' : '複製'}
          </button>
        </div>

        {/* Native share button */}
        {navigator.share && (
          <button className="native-share-btn" onClick={handleNativeShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            系統分享
          </button>
        )}

        {/* Copy as text */}
        <button className="copy-text-btn" onClick={handleCopyText}>
          📋 複製為純文字
        </button>

        {/* Export section */}
        <fieldset className="modal-fieldset">
          <legend>匯出檔案</legend>
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

        <button className="modal-export-btn" onClick={handleExport}>
          📥 匯出清單
        </button>

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-confirm"
            onClick={() => dispatch({ type: 'TOGGLE_SHARE' })}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
