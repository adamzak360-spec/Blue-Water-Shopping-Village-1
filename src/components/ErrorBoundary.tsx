import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="error-state"
          style={{
            maxWidth: '520px',
            margin: '3rem auto',
            padding: '2rem',
            textAlign: 'center',
            color: '#0a2e5c',
            background: '#f0fbfa',
            border: '1px solid #9ee8df',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(10, 46, 92, 0.08)',
          }}
        >
          <h3 style={{ marginBottom: '0.75rem' }}>We’re having trouble loading this page</h3>
          <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
            It looks like your internet connection may be unavailable or unstable. Please turn on your mobile data or connect to Wi‑Fi, then refresh the page and try again.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '0.5rem',
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
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
