'use client';

import { useState } from 'react';
import type { Thought } from '@/lib/schema';
import { useRouter } from 'next/navigation';

interface JournalDetailClientProps {
    journalId: string;
    initialThoughts: Thought[];
}

export default function JournalDetailClient({ journalId, initialThoughts }: JournalDetailClientProps) {
    const [thoughts, setThoughts] = useState(initialThoughts);
    const [selectedThought, setSelectedThought] = useState<Thought | null>(
        initialThoughts[0] || null
    );
    const [isFocusExpanded, setIsFocusExpanded] = useState(false);
    const router = useRouter();

    const regularThoughts = thoughts.filter(t => !t.context || (t.context as any).type !== 'auto_journal');
    const focusSessions = thoughts.filter(t => t.context && (t.context as any).type === 'auto_journal');

    console.log(journalId)

    const getVerdictColor = (verdict: string) => {
        const colors: Record<string, string> = {
            pursue: 'var(--accent-green)',
            explore: 'var(--accent-blue)',
            watchlist: 'var(--accent-amber)',
            ignore: 'var(--text-muted)',
            archive: 'var(--text-muted)',
        };
        return colors[verdict] || 'var(--text-muted)';
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
            {/* Left Sidebar - Thought List */}
            <div style={{
                width: '320px',
                borderRight: '1px solid var(--border-primary)',
                background: 'var(--bg-elevated)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border-primary)',
                    background: 'var(--bg-elevated)'
                }}>
                    <button
                        onClick={() => router.push('/journal')}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            width: '100%'
                        }}
                    >
                        ← Back to Journals
                    </button>
                    <button
                        onClick={() => router.push(`/journal/${journalId}/write`)}
                        style={{
                            padding: '10px 16px',
                            background: '#d6a14b',
                            border: 'none',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            cursor: 'pointer',
                            color: '#000',
                            fontSize: '14px',
                            fontWeight: 600,
                            width: '100%'
                        }}
                    >
                        ✎ Write New Entry
                    </button>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                    }}>
                        Your Thoughts
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        {thoughts.length} {thoughts.length === 1 ? 'entry' : 'entries'}
                    </p>
                </div>

                <div style={{ padding: '16px', flex: 1 }}>
                    {thoughts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <p>No thoughts yet</p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                Start by analyzing a decision!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {regularThoughts.map((thought) => (
                                <button
                                    key={thought.id}
                                    onClick={() => setSelectedThought(thought)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s',
                                        background: selectedThought?.id === thought.id
                                            ? 'var(--bg-primary)'
                                            : 'transparent',
                                        border: `2px solid ${selectedThought?.id === thought.id
                                            ? 'var(--accent-blue)'
                                            : 'transparent'}`,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <h3 style={{
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                        marginBottom: '8px',
                                        fontSize: '15px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        {thought.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: 'var(--text-muted)',
                                        marginBottom: '12px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {thought.content}
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '12px'
                                    }}>
                                        {thought.verdict && (
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                background: getVerdictColor(thought.verdict) + '20',
                                                color: getVerdictColor(thought.verdict)
                                            }}>
                                                {thought.verdict}
                                            </span>
                                        )}
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            {new Date(thought.createdAt ?? new Date()).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            ))}

                            {/* Focus Sessions Collapsible Section */}
                            {focusSessions.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <button
                                        onClick={() => setIsFocusExpanded(!isFocusExpanded)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'rgba(96, 165, 250, 0.05)',
                                            border: '1px solid rgba(96, 165, 250, 0.1)',
                                            borderRadius: '8px',
                                            color: '#60a5fa',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}
                                    >
                                        <span>⏱️ Focus Sessions ({focusSessions.length})</span>
                                        <span>{isFocusExpanded ? '▼' : '▶'}</span>
                                    </button>

                                    {isFocusExpanded && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                                            {focusSessions.map((thought) => (
                                                <button
                                                    key={thought.id}
                                                    onClick={() => setSelectedThought(thought)}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        transition: 'all 0.2s',
                                                        background: selectedThought?.id === thought.id
                                                            ? 'rgba(96, 165, 250, 0.1)'
                                                            : 'transparent',
                                                        border: `1px solid ${selectedThought?.id === thought.id
                                                            ? '#60a5fa'
                                                            : 'transparent'}`,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <h4 style={{
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '4px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {thought.title}
                                                    </h4>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {new Date(thought.createdAt ?? new Date()).toLocaleDateString()}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Selected Thought */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                {selectedThought ? (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h1 style={{
                                    fontSize: '32px',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    margin: 0
                                }}>
                                    {selectedThought.title}
                                </h1>
                                <button
                                    onClick={() => router.push(`/journal/${journalId}/write?thought=${selectedThought.id}`)}
                                    style={{
                                        padding: '10px 24px',
                                        background: '#d6a14b',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    ✏️ Edit Thought
                                </button>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                {new Date(selectedThought.createdAt ?? new Date()).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>

                        {selectedThought.verdict && (
                            <div style={{
                                padding: '24px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-primary)',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px'
                                }}>
                                    <span style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        background: getVerdictColor(selectedThought.verdict) + '20',
                                        color: getVerdictColor(selectedThought.verdict)
                                    }}>
                                        {selectedThought.verdict}
                                    </span>
                                    {selectedThought.confidence && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            Confidence: {selectedThought.confidence}%
                                        </span>
                                    )}
                                </div>

                                {(selectedThought.context as any)?.type === 'auto_journal' && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(96, 165, 250, 0.1)',
                                        border: '1px solid rgba(96, 165, 250, 0.2)',
                                        borderRadius: '8px',
                                        marginBottom: '16px',
                                        fontSize: '13px',
                                        color: '#60a5fa'
                                    }}>
                                        ⏱️ Focus Session Log
                                        {(selectedThought.context as any)?.duration && (
                                            <span style={{ marginLeft: '12px' }}>
                                                Duration: {(selectedThought.context as any).duration} min
                                            </span>
                                        )}
                                    </div>
                                )}

                                {selectedThought.reasoning && (
                                    <div style={{ marginTop: '16px' }}>
                                        <h3 style={{
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            marginBottom: '12px',
                                            fontSize: '16px'
                                        }}>
                                            {(selectedThought.context as any)?.type === 'auto_journal' ? 'Session Outcome' : 'Reasoning'}
                                        </h3>
                                        <p style={{
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.7,
                                            fontSize: '15px'
                                        }}>
                                            {selectedThought.reasoning}
                                        </p>
                                    </div>
                                )}

                                {selectedThought.timeline && (
                                    <div style={{ marginTop: '16px' }}>
                                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                            Timeline:{' '}
                                        </span>
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {selectedThought.timeline}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{
                            padding: '24px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-primary)',
                            marginBottom: '24px'
                        }}>
                            <h3 style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '16px',
                                fontSize: '16px'
                            }}>
                                Content
                            </h3>
                            <p style={{
                                whiteSpace: 'pre-wrap',
                                color: 'var(--text-primary)',
                                lineHeight: 1.7,
                                fontSize: '15px'
                            }}>
                                {selectedThought.content}
                            </p>
                        </div>

                        {selectedThought.actionItems && (selectedThought.actionItems as any[]).length > 0 && (
                            <div style={{
                                padding: '24px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-primary)'
                            }}>
                                <h3 style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '16px',
                                    fontSize: '16px'
                                }}>
                                    Action Items
                                </h3>
                                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(selectedThought.actionItems as any[]).map((item, index) => (
                                        <li key={index} style={{ display: 'flex', alignItems: 'start' }}>
                                            <input
                                                type="checkbox"
                                                checked={typeof item === 'object' ? item.completed : false}
                                                readOnly
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    marginRight: '12px',
                                                    marginTop: '2px',
                                                    accentColor: 'var(--accent-blue)'
                                                }}
                                            />
                                            <span style={{
                                                color: 'var(--text-primary)',
                                                fontSize: '15px',
                                                lineHeight: 1.6
                                            }}>
                                                {typeof item === 'string' ? item : (item.text || '')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '18px' }}>Select a thought to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
