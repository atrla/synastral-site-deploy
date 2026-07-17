import { Component } from 'react'

// Class component (React error boundaries can't be hooks). Wraps <App/> in
// main.jsx so a render-time exception anywhere in the tree — including a
// chart SVG that somehow slips past sanitizeSvg.js — gets a branded fallback
// instead of a blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('synastral: uncaught render error', error, info)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="error-boundary" role="alert">
        <span className="error-boundary-glyph" aria-hidden="true">✦</span>
        <p className="error-boundary-message">
          something drifted off the wheel — refresh to try again.
        </p>
        <button type="button" className="btn error-boundary-action" onClick={this.handleRefresh}>
          refresh
        </button>
      </div>
    )
  }
}
