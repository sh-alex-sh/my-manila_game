import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: '#1a3a4a', color: '#ff6b6b', fontFamily: 'sans-serif', minHeight: '100vh' }}>
          <h2>出错了!</h2>
          <pre style={{ color: '#ffa07a', whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ color: '#8a9aaa', whiteSpace: 'pre-wrap', fontSize: '0.85em', marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ marginTop: 20, padding: '10px 20px', background: '#3aba4a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
