import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// NOTE: React.StrictMode is intentionally omitted.
// StrictMode causes effects to run twice in development which breaks
// AR.js initialization (creates duplicate renderers and camera streams).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </BrowserRouter>
)
