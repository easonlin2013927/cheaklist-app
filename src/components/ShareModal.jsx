import { useState, useEffect } from 'react'
import { useChecklist } from '../utils/context'
import { encodeShareData, getShareUrl } from '../utils/share'
import { generateQRMatrix, qrToSVGPaths } from '../utils/qr'

export default function ShareModal() {
  const { state, dispatch } = useChecklist()
  const [shareUrl, setShareUrl] = useState('')
  const [qrSvg, setQrSvg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!state.showShare) return
    const data = encodeShareData(state.categories)
    if (data) {
      const url = getShareUrl(data)
      setShareUrl(url)
      // Generate QR code with inline fill color for reliability
      const matrix = generateQRMatrix(url)
      const { svg } = qrToSVGPaths(matrix, 4, 2)
      // Replace CSS variable with a solid color that matches theme
      setQrSvg(svg)
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

  return (
    <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_SHARE' })}>
      <div className="modal-dialog share-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">分享清單</h2>

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
