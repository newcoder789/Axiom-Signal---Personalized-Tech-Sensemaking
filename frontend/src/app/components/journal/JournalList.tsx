'use client';

import { useState } from 'react';
import type { Journal } from '@/lib/schema';
import { JournalCard } from './JournalCard';
import { CreateJournalDialog } from './CreateJournalDialog';
import { useRouter } from 'next/navigation';

interface JournalListProps {
    journals: Journal[];
}

export function JournalList({ journals }: JournalListProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const router = useRouter();

    const handleJournalClick = (journalId: string) => {
        router.push(`/journal/${journalId}`);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            padding: '40px 32px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '40px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '8px'
                        }}>
                            Your Journals
                        </h1>
                        <p style={{
                            fontSize: '16px',
                            color: 'var(--text-muted)'
                        }}>
                            {journals.length} {journals.length === 1 ? 'journal' : 'journals'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 600,
                            background: 'var(--accent-blue)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        + New Journal
                    </button>
                </div>

                {journals.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        borderRadius: '20px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📔</div>
                        <h3 style={{
                            fontSize: '24px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}>
                            No journals yet
                        </h3>
                        <p style={{
                            fontSize: '16px',
                            color: 'var(--text-muted)',
                            marginBottom: '32px',
                            maxWidth: '400px',
                            margin: '0 auto 32px'
                        }}>
                            Create your first journal to start organizing your tech decisions
                        </p>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            style={{
                                padding: '14px 28px',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: 600,
                                background: 'var(--accent-blue)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Create Journal
                        </button>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '20px'
                    }}>
                        {journals.map((journal) => (
                            <JournalCard
                                key={journal.id}
                                journal={journal}
                                onClick={() => handleJournalClick(journal.id)}
                            />
                        ))}
                    </div>
                )}

                {showCreateDialog && (
                    <CreateJournalDialog onClose={() => setShowCreateDialog(false)} />
                )}
            </div>
        </div>
    );
}
