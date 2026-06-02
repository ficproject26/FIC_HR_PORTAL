import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: '40px', fontFamily: "'Inter', sans-serif", background: '#f8fafc'
        }}>
          <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%' }}>
            <h2 style={{ color: '#ef4444', margin: '0 0 12px' }}>⚠️ Something went wrong</h2>
            <pre style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', fontSize: '0.8rem', color: '#b91c1c', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.info?.componentStack}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              style={{ marginTop: '16px', background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
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
