'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Thought {
    id: string;
    title: string;
    verdict?: string;
    createdAt?: string;
}

interface Journal {
    id: string;
    title: string;
    icon?: string;
    thoughtCount?: number;
}

export default function ExplorePage() {
    const router = useRouter();
    const [thought, setThought] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [recentThoughts, setRecentThoughts] = useState<Thought[]>([]);
    const [journals, setJournals] = useState<Journal[]>([]);

    useEffect(() => {
        // Fetch recent thoughts
        fetch('/api/thoughts/recent')
            .then(res => res.json())
            .then(data => setRecentThoughts(Array.isArray(data.thoughts) ? data.thoughts : []))
            .catch(() => setRecentThoughts([]));

        // Fetch journals
        fetch('/api/journals')
            .then(res => res.json())
            .then(data => setJournals(Array.isArray(data.journals) ? data.journals : []))
            .catch(() => setJournals([]));
    }, []);

    const handleSave = async () => {
        if (!thought.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: thought,
                    title: thought.slice(0, 50) + (thought.length > 50 ? "..." : "")
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            setThought('');
            // Refresh thoughts
            const refreshRes = await fetch('/api/thoughts/recent');
            const data = await refreshRes.json();
            setRecentThoughts(Array.isArray(data.thoughts) ? data.thoughts : []);
        } catch (e) {
            console.error(e);
            alert('Failed to save thought. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDecide = () => {
        if (!thought.trim()) return;
        // Navigate to decide page with the thought as a topic
        router.push(`/decide?topic=${encodeURIComponent(thought)}`);
    };

    const prompts = [
        { icon: '🤔', text: "I'm confused about..." },
        { icon: '🔍', text: "I'm curious about..." },
        { icon: '⚖️', text: "I'm torn between..." },
        { icon: '🎯', text: "I want to explore..." },
    ];

    return (
        <div style={{ display: 'flex', height: '100%', background: '#0f1115' }}>
            {/* Left Sidebar - Recent Activity */}
            <div style={{
                width: '240px',
                borderRight: '1px solid #222632',
                background: '#151821',
                padding: '20px 12px',
                overflowY: 'auto',
                flexShrink: 0
            }}>
                <h2 style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#a1a6b3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e'
                    }}></span>
                    Recent Activity
                </h2>

                {recentThoughts.length === 0 ? (
                    <div style={{
                        fontSize: '13px',
                        color: '#666',
                        padding: '16px',
                        background: '#0f1115',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        No recent thoughts
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {recentThoughts.map((t, i) => (
                            <button
                                key={t.id}
                                onClick={() => router.push(t.verdict ? `/decide?thought=${t.id}` : `/focus?thought=${t.id}`)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1c2029'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '8px'
                                }}>
                                    <span style={{
                                        fontSize: '13px',
                                        color: '#e6e8eb',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1
                                    }}>
                                        {t.title || 'Untitled'}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        color: '#666',
                                        flexShrink: 0
                                    }}>
                                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    </span>
                                </div>
                                {t.verdict && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '6px',
                                        fontSize: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: t.verdict === 'pursue' ? 'rgba(34, 197, 94, 0.15)' :
                                            t.verdict === 'explore' ? 'rgba(59, 130, 246, 0.15)' :
                                                'rgba(255, 255, 255, 0.05)',
                                        color: t.verdict === 'pursue' ? '#22c55e' :
                                            t.verdict === 'explore' ? '#3b82f6' :
                                                '#a1a6b3'
                                    }}>
                                        {t.verdict}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Journals Section */}
                <h2 style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#a1a6b3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: '32px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#f97316'
                    }}></span>
                    Journals
                </h2>

                {journals.length === 0 ? (
                    <div style={{
                        fontSize: '13px',
                        color: '#666',
                        padding: '16px',
                        background: '#0f1115',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        No journals yet
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {journals.map((j) => (
                            <button
                                key={j.id}
                                onClick={() => router.push(`/journal/${j.id}`)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1c2029'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '18px' }}>{j.icon || '📓'}</span>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#e6e8eb' }}>
                                        {j.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {j.thoughtCount || 0} thoughts
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => router.push('/journal')}
                    style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px',
                        background: 'transparent',
                        border: '1px dashed #222632',
                        borderRadius: '6px',
                        color: '#a1a6b3',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#d6a14b';
                        e.currentTarget.style.color = '#d6a14b';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#222632';
                        e.currentTarget.style.color = '#a1a6b3';
                    }}
                >
                    + New Journal
                </button>
            </div>

            {/* Center - Main Workbench */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#e6e8eb',
                        marginBottom: '8px'
                    }}>
                        Think & Explore
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: '#a1a6b3',
                        marginBottom: '32px'
                    }}>
                        Capture ideas, review your history, and gain clarity before deciding.
                    </p>

                    {/* Thought Capture Card */}
                    <div style={{
                        padding: '24px',
                        background: '#151821',
                        border: '1px solid #222632',
                        borderRadius: '12px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                            }}>
                                ✨
                            </div>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e6e8eb' }}>
                                    Start Thinking
                                </h2>
                                <p style={{ fontSize: '13px', color: '#666' }}>
                                    Capture a raw thought or confusing idea
                                </p>
                            </div>
                        </div>

                        <textarea
                            value={thought}
                            onChange={(e) => setThought(e.target.value)}
                            placeholder="What's on your mind? What are you confused, curious, or unsure about?"
                            style={{
                                width: '100%',
                                height: '140px',
                                padding: '16px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                color: '#e6e8eb',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#d6a14b'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#222632'}
                        />

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #222632'
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleSave}
                                    disabled={!thought.trim() || isSaving}
                                    style={{
                                        padding: '10px 16px',
                                        background: '#222632',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#e6e8eb',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: !thought.trim() || isSaving ? 'not-allowed' : 'pointer',
                                        opacity: !thought.trim() || isSaving ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    💾 Save
                                </button>
                                <button
                                    onClick={handleDecide}
                                    disabled={!thought.trim()}
                                    style={{
                                        padding: '10px 16px',
                                        background: 'transparent',
                                        border: '1px solid #222632',
                                        borderRadius: '6px',
                                        color: '#a1a6b3',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: !thought.trim() ? 'not-allowed' : 'pointer',
                                        opacity: !thought.trim() ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    🧠 Analyze
                                </button>
                            </div>
                            <button
                                onClick={handleDecide}
                                disabled={!thought.trim()}
                                style={{
                                    padding: '10px 20px',
                                    background: '#d6a14b',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#000',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: !thought.trim() ? 'not-allowed' : 'pointer',
                                    opacity: !thought.trim() ? 0.5 : 1
                                }}
                            >
                                Decide Now →
                            </button>
                        </div>
                    </div>

                    {/* Thinking Prompts */}
                    <div style={{
                        padding: '24px',
                        background: '#151821',
                        border: '1px solid #222632',
                        borderRadius: '12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                            }}>
                                💡
                            </div>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e6e8eb' }}>
                                    Thinking Prompts
                                </h2>
                                <p style={{ fontSize: '13px', color: '#666' }}>
                                    Kickstart your brain with these angles
                                </p>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px'
                        }}>
                            {prompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => setThought(prompt.text)}
                                    style={{
                                        padding: '16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#d6a14b';
                                        e.currentTarget.style.background = '#1c2029';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#222632';
                                        e.currentTarget.style.background = '#0f1115';
                                    }}
                                >
                                    <span style={{ fontSize: '24px' }}>{prompt.icon}</span>
                                    <span style={{ fontSize: '14px', color: '#a1a6b3' }}>
                                        {prompt.text}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
