import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Fab } from './components/Fab'
import { TabBar } from './components/TabBar'
import { ToastProvider } from './components/ToastProvider'
import { UpdatePrompt } from './components/UpdatePrompt'
import { defaultSettings, useSettings } from './db/settings'
import { routes } from './features/registry'
import { LockProvider } from './features/security/LockProvider'
import { useApplyTheme } from './lib/theme'

export function App() {
  const settings = useSettings() ?? defaultSettings
  useApplyTheme(settings.theme, settings.accent)

  return (
    <LockProvider>
      <HashRouter>
        <ToastProvider>
          <UpdatePrompt />
          <TabBar />
          <div className="lg:pl-60">
            <main className="mx-auto max-w-3xl px-safe pt-safe pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
              <Routes>
                {routes.map((r) => (
                  <Route key={r.path} path={r.path} element={r.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Fab />
        </ToastProvider>
      </HashRouter>
    </LockProvider>
  )
}
