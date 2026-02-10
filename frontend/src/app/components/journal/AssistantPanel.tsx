import { useState } from 'react';

interface AssistantAction {
    label: string;
    icon: string;
    id: string;
}

interface AssistantPanelProps {
    verdictData?: any;
    memorySnippets?: string[];
    evidenceSnippets?: any[];
}

export function AssistantPanel({ verdictData, memorySnippets = [], evidenceSnippets = [] }: AssistantPanelProps) {
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'memory' | 'evidence'>('memory');

    const actions: AssistantAction[] = [
        { label: 'Analyze', icon: '⚡', id: 'analyze' },
        { label: 'Summarize', icon: '📝', id: 'summarize' },
        { label: 'Extract Actions', icon: '✅', id: 'extract' },
        { label: 'Find Contradictions', icon: '🔍', id: 'contradictions' },
        { label: 'Test Alert', icon: '🔔', id: 'test_alert' },
    ];

    const handleAction = async (actionId: string) => {
        setIsLoading(true);
        setResponse(null);
        setActiveTab('response');

        try {
            if (actionId === 'test_alert') {
                await fetch('/api/test-broadcast');
                setResponse("🔔 Test notification trigger sent! Check for toast.");
                setIsLoading(false);
                return;
            }

            let endpoint = '';
            if (actionId === 'analyze') endpoint = '/api/decide/analyze';
            else if (actionId === 'summarize') endpoint = '/api/assistant/summarize';
            else if (actionId === 'extract') endpoint = '/api/assistant/extract-actions';
            else if (actionId === 'contradictions') endpoint = '/api/assistant/contradictions';

            const payload = {
                // user_profile: "Developer", // Let backend use default demo profile
                topic: verdictData?.topic || "current context",
                content: verdictData?.reasoning || ""
            };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Action failed');

            const data = await res.json();

            if (actionId === 'summarize') setResponse(data.summary);
            else if (actionId === 'extract') setResponse(Array.isArray(data.actions) ? data.actions.join('\n• ') : data.actions);
            else if (actionId === 'contradictions') setResponse(data.contradictions.join('\n'));
            else if (actionId === 'analyze') setResponse("Analysis triggered. Check the main view.");

        } catch (error) {
            console.error(error);
            setResponse("⚠️ Assistant is currently offline or encountered an error.");
        } finally {
            setIsLoading(false);
        }
    };

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Assistant
                    </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Proactive RAG Agent Active
                </p>
            </div>

            {/* Action Toolbar */}
            <div style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                borderBottom: '1px solid var(--border-primary)',
                background: 'rgba(255,255,255,0.02)'
            }}>
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => handleAction(action.id)}
                        disabled={isLoading}
                        style={{
                            padding: '10px',
                            background: action.id === 'test_alert' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-primary)',
                            border: action.id === 'test_alert' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-primary)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: action.id === 'test_alert' ? 'var(--accent-yellow)' : 'var(--text-primary)',
                            cursor: isLoading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                        onMouseLeave={(e) => !isLoading && (e.currentTarget.style.borderColor = action.id === 'test_alert' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-primary)')}
                    >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Tabs Selector */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-primary)',
                padding: '0 16px'
            }}>
                {[
                    { id: 'response', label: 'Response', icon: '🤖' },
                    { id: 'memory', label: 'Memory', icon: '💡' },
                    { id: 'evidence', label: 'Evidence', icon: '📊' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '20px' }}>
                {activeTab === 'response' && (
                    <div className="fade-in">
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div className="spinner" style={{ border: '2px solid #3b82f6', borderTop: '2px solid transparent', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Synthesizing knowledge...</p>
                            </div>
                        ) : response ? (
                            <div style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                lineHeight: 1.6,
                                background: 'rgba(59, 130, 246, 0.05)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                {response}
                            </div>
                        ) : (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                Select an action above to generate a response.
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'memory' && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '24px' }}>
                            {memorySnippets.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                    No related past entries found.
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
                                            color: 'var(--text-muted)',
                                            borderLeft: '3px solid var(--accent-blue)'
                                        }}
                                    >
                                        {snippet}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'evidence' && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '24px' }}>
                            {evidenceSnippets.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                    Run analysis to see technical evidence.
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
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                            {evidence.title}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                            {evidence.snippet}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

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
        </div>
    );
}
