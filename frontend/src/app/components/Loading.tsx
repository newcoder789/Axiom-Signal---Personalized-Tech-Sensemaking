export function LoadingSpinner({ size = 20 }: { size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                border: '2px solid var(--border-primary)',
                borderTopColor: '#d6a14b',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }}
        />
    );
}

export function LoadingSkeleton({ width = '100%', height = 20 }: { width?: string | number; height?: number }) {
    return (
        <div
            style={{
                width,
                height,
                background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-primary) 50%, var(--bg-elevated) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '4px'
            }}
        />
    );
}

export function PageLoader() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--bg-primary)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <LoadingSpinner size={40} />
                <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Loading...
                </p>
            </div>
        </div>
    );
}
