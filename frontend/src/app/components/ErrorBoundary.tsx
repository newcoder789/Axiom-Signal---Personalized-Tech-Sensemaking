'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '40px',
                    textAlign: 'center',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#f87171',
                        marginBottom: '8px'
                    }}>
                        Something went wrong
                    </h2>
                    <p style={{
                        color: 'var(--text-muted)',
                        marginBottom: '20px',
                        maxWidth: '400px'
                    }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '10px 20px',
                            background: '#d6a14b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Error fallback for API calls
export function APIErrorFallback({
    error,
    onRetry
}: {
    error: string;
    onRetry?: () => void
}) {
    return (
        <div style={{
            padding: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
        }}>
            <p style={{ color: '#f87171', marginBottom: '12px' }}>
                ❌ {error}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Retry
                </button>
            )}
        </div>
    );
}
