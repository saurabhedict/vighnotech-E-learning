import { Component } from 'react'

// Catches render/effect errors so a component crash shows a message + recovery
// instead of a blank page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-vigno-panel border border-vigno-line rounded-2xl p-6">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-lg font-bold mb-1">Something broke on this screen</h2>
          <p className="text-sm text-vigno-muted mb-4">{String(this.state.error?.message || this.state.error)}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => this.setState({ error: null })}
              className="bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-4 py-2 text-sm">Dismiss</button>
            <button onClick={() => window.location.reload()}
              className="bg-vigno-accent text-vigno-accent-txt font-bold rounded-lg px-4 py-2 text-sm">Reload</button>
          </div>
        </div>
      </div>
    )
  }
}
