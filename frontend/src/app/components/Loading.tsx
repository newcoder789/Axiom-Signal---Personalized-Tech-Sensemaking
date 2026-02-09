'use client';

import React from 'react';

// Spinner component
export function LoadingSpinner({ size = 20, color = '#d6a14b' }: { size?: number; color?: string }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                border: `2px solid var(--border-primary)`,
                borderTopColor: color,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }}
        />
    );
}

// Skeleton for text
export function SkeletonText({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
    return (
        <div
            style={{
                width,
                height,
                background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-tertiary) 50%, var(--bg-elevated) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '4px'
            }}
        />
    );
}

// Skeleton card
export function SkeletonCard() {
    return (
        <div style={{
            padding: '20px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px'
        }}>
            <SkeletonText width="60%" height={20} />
            <div style={{ height: '12px' }} />
            <SkeletonText width="100%" height={14} />
            <div style={{ height: '8px' }} />
            <SkeletonText width="80%" height={14} />
        </div>
    );
}

// Full page loader
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: '16px'
        }}>
            <LoadingSpinner size={40} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{message}</p>
        </div>
    );
}

// Button with loading state
export function LoadingButton({
    loading,
    children,
    onClick,
    disabled,
    style,
    ...props
}: {
    loading: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading || disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loading || disabled ? 0.7 : 1,
                cursor: loading || disabled ? 'not-allowed' : 'pointer',
                ...style
            }}
            {...props}
        >
            {loading && <LoadingSpinner size={16} />}
            {children}
        </button>
    );
}

// Skeleton list
export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

// Verdict skeleton
export function VerdictSkeleton() {
    return (
        <div style={{
            padding: '24px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <SkeletonText width={100} height={32} />
                <SkeletonText width={80} height={24} />
            </div>
            <SkeletonText width="100%" height={16} />
            <div style={{ height: '8px' }} />
            <SkeletonText width="90%" height={16} />
            <div style={{ height: '8px' }} />
            <SkeletonText width="70%" height={16} />
            <div style={{ height: '20px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
                <SkeletonText width={120} height={40} />
                <SkeletonText width={120} height={40} />
            </div>
        </div>
    );
}

// Journal list skeleton
export function JournalListSkeleton() {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
        }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                    padding: '20px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <SkeletonText width={40} height={40} />
                        <SkeletonText width="60%" height={20} />
                    </div>
                    <SkeletonText width="80%" height={14} />
                    <div style={{ height: '8px' }} />
                    <SkeletonText width="40%" height={12} />
                </div>
            ))}
        </div>
    );
}
