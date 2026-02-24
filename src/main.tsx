import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import { seedDatabase } from './db/seed'
import { useUIStore } from './stores/ui-store'
import App from './App.tsx'

// Apply saved theme on load
const { settings, applyTheme } = useUIStore.getState()
applyTheme(settings.theme)

// Seed database with exercises
seedDatabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
