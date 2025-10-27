import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import { ThemeProvider } from './contexts/ThemeContext'
import { initDevAuth } from './utils/devAuth'
import './i18n'
import './styles/globals.css'
import './styles/dashboard-enhanced.css'
import App from './App.tsx'

// Initialize development authentication
initDevAuth(store.dispatch)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
