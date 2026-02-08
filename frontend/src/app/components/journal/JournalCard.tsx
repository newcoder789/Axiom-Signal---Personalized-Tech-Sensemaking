'use client';

import type { Journal } from '@/lib/schema';

interface JournalCardProps {
    journal: Journal & { thoughtCount?: number };
    onClick?: () => void;
}

export function JournalCard({ journal, onClick }: JournalCardProps) {
    const thoughtCount = journal.thoughtCount || 0;

    return (
        <div
            onClick={onClick}
            style={{
                width: '100%',
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{
                            background: journal.color || 'var(--accent-blue)',
                            opacity: 0.9
                        }}
                    >
                        {journal.icon || '📔'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                            {journal.title}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            {journal.description || 'No description'}
                        </p>
                    </div>
                </div>
                <div
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)'
                    }}
                >
                    {thoughtCount} {thoughtCount === 1 ? 'thought' : 'thoughts'}
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                <span>
                    Updated {new Date(journal.updatedAt ?? journal.createdAt ?? new Date()).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}
