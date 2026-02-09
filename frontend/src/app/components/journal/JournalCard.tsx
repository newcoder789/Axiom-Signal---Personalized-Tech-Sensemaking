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
            className="card-premium"
            style={{
                width: '100%',
                padding: '24px',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl glass"
                        style={{
                            border: `1px solid ${journal.color || 'var(--accent-blue)'}`,
                            boxShadow: `0 0 15px ${journal.color || 'var(--accent-blue)'}33`
                        }}
                    >
                        {journal.icon || '📔'}
                    </div>
                    <div>
                        <h3 className="h3" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
                            {journal.title}
                        </h3>
                        <p className="caption mt-1" style={{ fontSize: '13px' }}>
                            {journal.description || 'Continuous tech analysis stream'}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex items-center gap-2">
                    <div className="pulse-gold" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></div>
                    <span className="label" style={{ fontSize: '10px', color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
                        MEMORY SYNC ACTIVE
                    </span>
                </div>
                <div
                    className="px-3 py-1 rounded-full text-xs font-semibold glass"
                    style={{
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    {thoughtCount} {thoughtCount === 1 ? 'thought' : 'thoughts'}
                </div>
            </div>
        </div>
    );
}
