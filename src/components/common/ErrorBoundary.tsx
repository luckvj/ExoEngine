import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        import('../../utils/logger').then(({ errorLog }) => {
            errorLog('ErrorBoundary', 'Caught error:', error, errorInfo);
        });
        this.setState({ errorInfo });

        // Error is logged to console
        // For production error tracking, integrate Sentry or similar service
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    padding: '40px',
                    maxWidth: '600px',
                    margin: '100px auto',
                    textAlign: 'center',
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '2px solid rgba(255, 0, 0, 0.3)',
                    borderRadius: '8px'
                }}>
                    <h2 style={{ color: '#ff4444', marginBottom: '16px' }}>Something went wrong</h2>
                    <p style={{ color: '#ccc', marginBottom: '24px' }}>
                        ExoEngine encountered an unexpected error. This has been logged.
                    </p>

                    {this.state.error && (
                        <details style={{
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '16px',
                            borderRadius: '4px',
                            marginBottom: '24px'
                        }}>
                            <summary style={{ cursor: 'pointer', color: '#ff8888', marginBottom: '8px' }}>
                                Error Details
                            </summary>
                            <pre style={{
                                fontSize: '12px',
                                color: '#ff6666',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}

                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '12px 24px',
                            background: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginRight: '12px'
                        }}
                    >
                        Try Again
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            padding: '12px 24px',
                            background: '#444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Go Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
