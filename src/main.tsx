import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/latin-300.css'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-ext-300.css'
import '@fontsource/outfit/latin-ext-400.css'
import '@fontsource/outfit/latin-ext-500.css'
import '@fontsource/outfit/latin-ext-600.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-ext-400.css'
import '@fontsource/cormorant-garamond/latin-ext-500.css'
import '@fontsource/cormorant-garamond/latin-ext-600.css'
import './styles/theme.css'
import './index.css'
import './styles/foundation.css'
import './styles/layout.css'
import './styles/surfaces.css'
import './styles/scenes.css'
import './styles/overlays.css'
import App from './App.tsx'
import { ToastProviderWithViewport } from './components/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProviderWithViewport>
      <App />
    </ToastProviderWithViewport>
  </StrictMode>,
)
