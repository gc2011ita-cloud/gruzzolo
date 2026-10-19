import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Se una pagina va in errore mostra un messaggio (con il dettaglio tecnico da riferire)
 * invece di lasciare lo schermo vuoto. Va montato con `key` legata al percorso,
 * così cambiando pagina l'errore si azzera.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Errore nella pagina', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section role="alert" className="mt-6 rounded-2xl bg-surface p-5">
        <h1 className="text-xl font-semibold">{t().errors.title}</h1>
        <p className="mt-2 text-muted">{t().errors.body}</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs whitespace-pre-wrap">
          {error.name}: {error.message}
        </pre>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="#/"
            onClick={() => this.setState({ error: null })}
            className="pressable flex min-h-11 items-center justify-center rounded-xl bg-surface-2 font-semibold"
          >
            {t().errors.home}
          </a>
          <button
            type="button"
            onClick={() => location.reload()}
            className="pressable min-h-11 rounded-xl bg-accent font-semibold text-white"
          >
            {t().common.reload}
          </button>
        </div>
      </section>
    )
  }
}
