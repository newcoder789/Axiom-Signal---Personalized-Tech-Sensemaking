'use client';

interface AssistantAction {
    label: string;
    icon: string;
    onClick: () => void;
}

interface AssistantPanelProps {
    verdictData?: any;
    memorySnippets?: string[];
    evidenceSnippets?: any[];
}

export function AssistantPanel({ verdictData, memorySnippets = [], evidenceSnippets = [] }: AssistantPanelProps) {
    const actions: AssistantAction[] = [
        { label: 'Analyze', icon: '⚡', onClick: () => console.log('Analyze') },
        { label: 'Summarize', icon: '📝', onClick: () => console.log('Summarize') },
        { label: 'Extract Actions', icon: '✅', onClick: () => console.log('Extract') },
        { label: 'Find Contradictions', icon: '🔍', onClick: () => console.log('Contradictions') },
    ];

    return (
        <div style={{
            width: '360px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderLeft: '1px solid var(--border-primary)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                padding: '24px',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Assistant
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Ask about your thinking. Extract actions. Summarize.
                </p>
            </div>

            {/* Action Toolbar */}
            <div style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        style={{
                            padding: '10px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                    >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Tabs Content Area */}
            <div style={{ flex: 1, padding: '16px' }}>
                {/* Memory Section */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                        💡 Memory
                    </h3>
                    {memorySnippets.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            No related past entries
                        </p>
                    ) : (
                        memorySnippets.map((snippet, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '12px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    fontSize: '13px',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                {snippet}
                            </div>
                        ))
                    )}
                </div>

                {/* Evidence Section */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                        📊 Evidence
                    </h3>
                    {evidenceSnippets.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Run analysis to see evidence
                        </p>
                    ) : (
                        evidenceSnippets.map((evidence, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '12px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    marginBottom: '8px'
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {evidence.title}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {evidence.snippet}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Verdict Display (if available) */}
                {verdictData && (
                    <div style={{
                        padding: '16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{
                                padding: '4px 12px',
                                background: 'var(--accent-blue)',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                            }}>
                                {verdictData.verdict}
                            </span>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                {verdictData.confidence}%
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            {verdictData.reasoning}
                        </p>
                    </div>
                )}
            </div>

            {/* Feedback Buttons (at bottom if verdict exists) */}
            {verdictData && (
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    {['Agree', 'Too Optimistic', 'Too Pessimistic'].map((feedback) => (
                        <button
                            key={feedback}
                            style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            {feedback}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
