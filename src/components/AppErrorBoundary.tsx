import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '2rem',
            background: '#f0fbfa',
            border: '1px solid #9ee8df',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(10, 46, 92, 0.08)',
          }}>
            <h2 style={{ color: '#0a2e5c', marginBottom: '0.75rem' }}>We’re having trouble loading this page</h2>
            <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              It looks like your internet connection may be unavailable or unstable. Please turn on your mobile data or connect to Wi‑Fi, then tap Refresh Page to try again. If you already have internet, wait a moment and reload once more.
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.625rem 1.5rem',
                background: '#0a8f8a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
