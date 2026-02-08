'use client';

import { useState, useEffect } from 'react';
import type { Thought } from '@/lib/schema';

interface JournalEditorProps {
    thought?: Thought | null;
    onAnalyze?: (content: { title: string; body: string }) => void;
    onSave?: (content: { title: string; body: string }) => void;
}

export function JournalEditor({ thought, onAnalyze, onSave }: JournalEditorProps) {
    const [title, setTitle] = useState(thought?.title || '');
    const [body, setBody] = useState(thought?.content || '');
    const [assumptions, setAssumptions] = useState<string[]>([]);
    const [questions, setQuestions] = useState<string[]>([]);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Reset editor when thought changes
    useEffect(() => {
        setTitle(thought?.title || '');
        setBody(thought?.content || '');
        setLastSaved(null);
    }, [thought]);

    // Auto-save functionality with debounce
    useEffect(() => {
        if (!title.trim() && !body.trim()) return;

        const timeoutId = setTimeout(() => {
            setIsSaving(true);
            if (onSave) {
                onSave({ title, body });
                setLastSaved(new Date());
            }
            setTimeout(() => setIsSaving(false), 500);
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeoutId);
    }, [title, body]);

    const handleAnalyze = () => {
        if (onAnalyze) {
            onAnalyze({ title, body });
        }
    };

    const handleSaveDraft = () => {
        if (onSave) {
            setIsSaving(true);
            onSave({ title, body });
            setLastSaved(new Date());
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            height: '100%'
        }}>
            {/* Auto-save Status */}
            {(title || body) && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    fontSize: '12px',
                    color: isSaving ? '#fbbf24' : lastSaved ? '#4ade80' : 'var(--text-muted)',
                    opacity: 0.7
                }}>
                    {isSaving ? '⏳ Saving...' : lastSaved ? `✓ Saved at ${lastSaved.toLocaleTimeString()}` : ''}
                </div>
            )}

            {/* Title and Meta */}
            <div>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title..."
                    style={{
                        width: '100%',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        color: 'var(--text-primary)',
                        fontSize: '20px',
                        fontWeight: 600,
                        outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                />
            </div>

            {/* Main Writing Area */}
            <div style={{ flex: 1 }}>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your idea or paste notes. Press Ctrl+Enter to analyze."
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '400px',
                        background: '#121318',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        padding: '20px',
                        color: 'var(--text-muted)',
                        fontSize: '16px',
                        lineHeight: 1.7,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                    onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                            e.preventDefault();
                            handleAnalyze();
                        }
                    }}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={handleAnalyze}
                    style={{
                        padding: '12px 28px',
                        background: '#d6a14b',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    Analyze
                </button>
                <button
                    onClick={handleSaveDraft}
                    style={{
                        padding: '12px 28px',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    Save Draft
                </button>
            </div>

            {/* Structured Sections - Collapsible Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {/* Assumptions Card */}
                <div style={{
                    background: '#151821',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    padding: '16px'
                }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
                        Assumptions
                    </h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        {assumptions.length === 0 ? 'No assumptions added yet' : assumptions.map((a, i) => (
                            <div key={i}>• {a}</div>
                        ))}
                    </div>
                </div>

                {/* Questions Card */}
                <div style={{
                    background: '#151821',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    padding: '16px'
                }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
                        Open Questions
                    </h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        {questions.length === 0 ? 'No questions yet' : questions.map((q, i) => (
                            <div key={i}>• {q}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
