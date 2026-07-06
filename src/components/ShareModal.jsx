import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (!state.showShare) return
    try {
      const data = encodeShareData(state.categories)
      if (data) {
        const url = getShareUrl(data)
        setShareUrl(url)
        const qr = generateQRMatrix(url)
        const { svg } = qrToSVG(qr, 4, 2)
        setQrSvg(svg)
      }
    } catch (err) {
      console.error('QR generation failed:', err)
      setShareUrl('編碼失敗，請重試')
    }
  }, [state.showShare, state.categories])

  if (!state.showShare) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExport = () => {
    exportItems(state.categories, selectedFormat, includeDone)
  }

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_SHARE' })}>
      <div className="modal-dialog share-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">分享與匯出</h2>

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
            onClick={handleCopy}
            aria-label={copied ? '已複製' : '複製連結'}
          >
            {copied ? '✓' : '複製'}
          </button>
        </div>

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
