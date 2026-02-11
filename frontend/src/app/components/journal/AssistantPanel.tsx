import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import taskService from '@/lib/tasks/TaskService';

import { API_BASE_URL } from '@/lib/config';

interface AssistantAction {
    label: string;
    icon: string;
    id: string;
}

interface AssistantPanelProps {
    verdictData?: any;
    liveContent?: { title: string; body: string };
    journalId?: string;
    memorySnippets?: string[];
    evidenceSnippets?: any[];
}

export function AssistantPanel({ verdictData, liveContent, journalId, memorySnippets: initialMemory = [], evidenceSnippets: initialEvidence = [] }: AssistantPanelProps) {
    const [response, setResponse] = useState<string | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'memory' | 'evidence' | 'sources'>('memory');
    const [memorySnippets, setMemorySnippets] = useState<string[]>(initialMemory);
    const [evidenceSnippets, setEvidenceSnippets] = useState<any[]>(initialEvidence);
    const [sourceSnippets, setSourceSnippets] = useState<string[]>([]);

    // Dynamic memory lookup when title changes significanty
    useEffect(() => {
        const fetchRelated = async () => {
            if (!liveContent?.title || liveContent.title.length < 3) return;
            try {
                const url = `${API_BASE_URL}/api/assistant/memory/search?query=${encodeURIComponent(liveContent.title)}${journalId ? `&journal_id=${journalId}` : ''}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data.snippets) setMemorySnippets(data.snippets);
                }
            } catch (e) {
                console.error("Memory lookup failed", e);
            }
        };

        const timer = setTimeout(fetchRelated, 1000);
        return () => clearTimeout(timer);
    }, [liveContent?.title]);

    const actions: AssistantAction[] = [
        { label: 'Analyze', icon: '⚡', id: 'analyze' },
        { label: 'Pitch', icon: '🏆', id: 'generate_pitch' },
        { label: 'Summarize', icon: '📝', id: 'summarize' },
        { label: 'Tasks', icon: '📋', id: 'extract-tasks' },
        { label: 'Contradictions', icon: '⚖️', id: 'find-contradictions' },
        { label: 'Advice', icon: '💡', id: 'quick-advice' },
        { label: 'Daily Review', icon: '📅', id: 'daily-review' },
        { label: 'Decide Now', icon: '🎯', id: 'decide-now' }
    ];

    const handleAction = async (actionId: string) => {
        setIsLoading(true);
        setResponse(null);
        setEvidenceSnippets([]);
        setSourceSnippets([]);
        setActiveTab('response');

        try {
            if (actionId === 'test_alert') {
                await fetch('/api/test-broadcast');
                setResponse("🔔 Test notification trigger sent! Check for toast.");
                setIsLoading(false);
                return;
            }

            // Standardize on TaskService for Real Reasoning
            const combinedContent = `${liveContent?.title || ''}\n${liveContent?.body || ''}`.trim();
            const manualContext = {
                selectedEntry: combinedContent || verdictData?.reasoning || "",
                latestEntry: combinedContent,
                topic: liveContent?.title || verdictData?.topic || "current context",
                journalId: journalId
            };

            const result = await taskService.executeTask(actionId, 'default', manualContext);
            setActiveActionId(actionId);

            if (result.success) {
                // Handle different response formats from TaskHandlers
                let formattedResponse = "";
                try {
                    if (result.advice) {
                        formattedResponse = result.advice;
                    } else if (result.pitch_report) {
                        formattedResponse = result.pitch_report;
                    } else if (result.summary) {
                        formattedResponse = result.summary;
                    } else if (result.contradictions) {
                        formattedResponse = "⚠️ **Strategic Contradictions Found:**\n\n" +
                            (result.contradictions.length > 0
                                ? result.contradictions.map((c: string) => `- ${c}`).join('\n')
                                : "*No technical contradictions detected in your current narrative.*");
                    } else if (result.tasks) {
                        formattedResponse = "📝 **Technical Tasks:**\n\n" +
                            (result.tasks.length > 0
                                ? result.tasks.map((t: string) => `- ${t}`).join('\n')
                                : "*No project milestones or high-level tasks found.*");
                    } else if (result.review) {
                        const stats = result.review.stats;
                        formattedResponse = `📅 **Daily Technical Review**\n\n` +
                            `**Progress**: ${stats.entries} entries | ${stats.totalWords} words\n` +
                            `**Focus**: ${stats.topTopics.join(', ')}\n\n` +
                            `---\n\n${result.review.text}`;
                    } else if (result.decisions) {
                        formattedResponse = "⚖️ **Decision Audit:**\n\n" +
                            result.decisions.map((d: any) =>
                                `**${d.verdict}** ${d.id === 'live-1' ? '(Live Analysis)' : ''}\n` +
                                `> ${d.reasoning}`
                            ).join('\n\n---\n\n');
                    } else if (result.response) {
                        formattedResponse = result.response;
                    } else {
                        formattedResponse = "Task completed successfully.";
                    }
                } catch (fmtError) {
                    console.error("Response formatting failed:", fmtError);
                    formattedResponse = result.response || "Task completed, but response display failed. Please check the 'Summary' tab.";
                }

                setResponse(formattedResponse);

                // If it's an analysis task, update evidence and sources
                if (result.evidence) {
                    setEvidenceSnippets(result.evidence);
                }
                if (result.sources) {
                    setSourceSnippets(result.sources);
                }
            } else {
                throw new Error(result.error || "Action failed");
            }

        } catch (error: any) {
            console.error(error);
            setResponse(`⚠️ Assistant Error: ${error.message || "Unknown error"}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear active action highlight when switching away from response tab
    useEffect(() => {
        if (activeTab !== 'response') {
            setActiveActionId(null);
        }
    }, [activeTab]);

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
                            background: activeActionId === action.id
                                ? (action.id === 'generate_pitch' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                                : (action.id === 'test_alert' ? 'rgba(245, 158, 11, 0.1)' : (action.id === 'generate_pitch' ? 'rgba(234, 179, 8, 0.05)' : 'var(--bg-primary)')),
                            border: activeActionId === action.id
                                ? (action.id === 'generate_pitch' ? '1px solid var(--accent-yellow)' : '1px solid var(--accent-blue)')
                                : (action.id === 'test_alert' ? '1px solid rgba(245, 158, 11, 0.3)' : (action.id === 'generate_pitch' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid var(--border-primary)')),
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: activeActionId === action.id
                                ? (action.id === 'generate_pitch' ? 'var(--accent-yellow)' : 'var(--accent-blue)')
                                : (action.id === 'test_alert' ? 'var(--accent-yellow)' : (action.id === 'generate_pitch' ? 'var(--accent-yellow)' : 'var(--text-primary)')),
                            cursor: isLoading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.7 : 1,
                            boxShadow: activeActionId === action.id ? `0 0 12px ${action.id === 'generate_pitch' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.1)'}` : 'none'
                        }}
                        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                        onMouseLeave={(e) => !isLoading && (e.currentTarget.style.borderColor = activeActionId === action.id ? 'var(--accent-blue)' : (action.id === 'test_alert' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-primary)'))}
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
                    { id: 'evidence', label: 'Evidence', icon: '📊' },
                    { id: 'sources', label: 'Sources', icon: '🔗' }
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
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                lineHeight: 1.6,
                                background: activeActionId === 'generate_pitch' ? 'rgba(234, 179, 8, 0.03)' : 'rgba(59, 130, 246, 0.05)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: activeActionId === 'generate_pitch' ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
                                boxShadow: activeActionId === 'generate_pitch' ? '0 4px 20px rgba(0,0,0,0.1)' : 'none'
                            }}>
                                {activeActionId === 'generate_pitch' && (
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        background: 'var(--accent-yellow)',
                                        color: '#000',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        borderRadius: '3px',
                                        marginBottom: '12px',
                                        letterSpacing: '0.1em'
                                    }}>
                                        EXECUTIVE PITCH REPORT
                                    </div>
                                )}
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {response}
                                    </ReactMarkdown>
                                </div>
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
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent-yellow)', letterSpacing: '0.1em' }}>DECISION EVIDENCE LEDGER</div>
                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--accent-yellow) 0%, transparent 100%)', opacity: 0.3 }}></div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            {evidenceSnippets.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                    Run analysis to generate the evidence ledger.
                                </p>
                            ) : (
                                evidenceSnippets.map((evidence, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '16px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: '8px',
                                            marginBottom: '12px',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '4px',
                                            height: '100%',
                                            background: evidence.type === 'Architectural Drift' ? 'var(--accent-yellow)' : (evidence.type === 'Strategic Pivot' ? '#a855f7' : 'var(--accent-blue)')
                                        }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {evidence.title}
                                            </div>
                                            <div style={{
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: evidence.type === 'Architectural Drift' ? 'rgba(234, 179, 8, 0.15)' : (evidence.type === 'Strategic Pivot' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                                                color: evidence.type === 'Architectural Drift' ? 'var(--accent-yellow)' : (evidence.type === 'Strategic Pivot' ? '#a855f7' : 'var(--accent-blue)'),
                                                border: `1px solid ${evidence.type === 'Architectural Drift' ? 'rgba(234, 179, 8, 0.3)' : (evidence.type === 'Strategic Pivot' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(59, 130, 246, 0.3)')}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {evidence.type || 'Technical Finding'}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                            "{evidence.snippet}"
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>AUDIT REFERENCES</div>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)', opacity: 0.5 }}></div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            {sourceSnippets.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                                    Audit sources will appear here.
                                </p>
                            ) : (
                                sourceSnippets.map((source, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '10px 14px',
                                            background: 'rgba(255,255,255,0.01)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.2s',
                                            cursor: 'default'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                                    >
                                        <span style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-elevated)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            border: '1px solid var(--border-secondary)',
                                            opacity: 0.6
                                        }}>
                                            {i + 1}
                                        </span>
                                        <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {source}
                                        </div>
                                        <div style={{ opacity: 0.3, fontSize: '10px' }}>🔗</div>
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
