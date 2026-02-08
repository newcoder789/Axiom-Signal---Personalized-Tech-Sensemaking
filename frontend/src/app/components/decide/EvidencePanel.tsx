'use client';

interface EvidencePanelProps {
    toolEvidence?: {
        freshness?: any;
        market?: any;
        friction?: any;
    };
    sources?: Array<{
        title: string;
        url: string;
        snippet: string;
        domain: string;
        date: string;
    }>;
    memoryMatches?: string[];
}

export function EvidencePanel({ toolEvidence, sources = [], memoryMatches = [] }: EvidencePanelProps) {
    return (
        <div style={{
            width: '360px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderLeft: '1px solid #222632',
            background: '#151821',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid #222632'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e6e8eb' }}>
                    Evidence & Memory
                </h2>
            </div>

            {/* Tabs */}
            <div style={{ padding: '16px' }}>
                {/* Evidence Section */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#e6e8eb',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        📊 Evidence
                    </h3>

                    {toolEvidence ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Freshness */}
                            {toolEvidence.freshness && (
                                <div style={{
                                    padding: '12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa' }}>
                                            ⚡ Freshness
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#a1a6b3', lineHeight: 1.5 }}>
                                        {toolEvidence.freshness.reason || 'Model data is current'}
                                    </p>
                                </div>
                            )}

                            {/* Market Signal */}
                            {toolEvidence.market && (
                                <div style={{
                                    padding: '12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
                                            📈 Market Signal
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#a1a6b3' }}>
                                            {(toolEvidence.market.confidence * 100).toFixed(0)}% conf.
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#a1a6b3', lineHeight: 1.5 }}>
                                        Adoption: {toolEvidence.market.adoption}
                                    </p>
                                </div>
                            )}

                            {/* Friction */}
                            {toolEvidence.friction && (
                                <div style={{
                                    padding: '12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a6b3' }}>
                                            🔧 Friction
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#a1a6b3', lineHeight: 1.5 }}>
                                        Overall: {(toolEvidence.friction.overall * 100).toFixed(0)}%
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p style={{ fontSize: '13px', color: '#a1a6b3' }}>
                            Run analysis to see evidence
                        </p>
                    )}
                </div>

                {/* Memory Section */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#e6e8eb',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        💡 Memory
                    </h3>

                    {memoryMatches.length > 0 ? (
                        memoryMatches.map((match, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '8px',
                                    marginBottom: '8px'
                                }}
                            >
                                <p style={{ fontSize: '12px', color: '#a1a6b3', lineHeight: 1.5 }}>
                                    {match}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p style={{ fontSize: '13px', color: '#a1a6b3' }}>
                            No related past decisions
                        </p>
                    )}
                </div>

                {/* Sources Section */}
                {sources.length > 0 && (
                    <div>
                        <h3 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#e6e8eb',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            🔗 Sources
                        </h3>

                        {sources.map((source, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '8px',
                                    marginBottom: '10px'
                                }}
                            >
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#60a5fa',
                                        textDecoration: 'none',
                                        display: 'block',
                                        marginBottom: '4px'
                                    }}
                                >
                                    {source.title}
                                </a>
                                <div style={{
                                    fontSize: '11px',
                                    color: '#666',
                                    marginBottom: '6px'
                                }}>
                                    {source.domain} · {source.date}
                                </div>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#a1a6b3',
                                    lineHeight: 1.5
                                }}>
                                    {source.snippet}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
