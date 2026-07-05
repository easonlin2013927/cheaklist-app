import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ChecklistProvider } from './utils/context'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChecklistProvider>
      <App />
    </ChecklistProvider>
  </StrictMode>,
)
