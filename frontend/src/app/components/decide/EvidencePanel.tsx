'use client';

import { useState } from "react";

interface EvidencePanelProps {
    toolEvidence?: any;
    sources?: Array<{
        title: string;
        url: string;
        snippet: string;
        domain: string;
        date: string;
    }>;
    memoryMatches?: Array<{
        id: string;
        text: string;
        verdict: string;
        date: string;
        similarity: number;
    }>;
    verdict?: any;
}

export function EvidencePanel({ sources = [], memoryMatches = [], verdict }: EvidencePanelProps) {
    const [activeTab, setActiveTab] = useState<'ledger' | 'raw' | 'sources'>('ledger');

    const ledger = verdict?.ledger || null;

    return (
        <div style={{
            width: '400px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderLeft: '1px solid #222632',
            background: '#0d0f14',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
        }}>
            {/* Header */}
            <div style={{
                padding: '24px 20px',
                borderBottom: '1px solid #1e222d',
                background: 'linear-gradient(to bottom, #151821, #0d0f14)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d6a14b', boxShadow: '0 0 8px #d6a14b' }} />
                    <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#e6e8eb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Decision Evidence Ledger
                    </h2>
                </div>
                <p style={{ fontSize: '11px', color: '#636e7b', marginLeft: '16px' }}>
                    Audit trail for personalized reasoning
                </p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', background: '#050608', padding: '4px', borderRadius: '8px', marginTop: '20px' }}>
                    {(['ledger', 'sources', 'raw'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: '8px 4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                textTransform: 'capitalize',
                                color: activeTab === tab ? '#e6e8eb' : '#636e7b',
                                background: activeTab === tab ? '#1e222d' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab === 'raw' ? 'Debug' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'ledger' && (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {!ledger && !verdict ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#636e7b' }}>
                                <div style={{ fontSize: '24px', marginBottom: '12px' }}>📝</div>
                                <p style={{ fontSize: '13px' }}>Run analysis to generate the decision ledger and audit trail.</p>
                            </div>
                        ) : (
                            <>
                                {/* Bucket 1: Context Evidence */}
                                <section>
                                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#d6a14b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        01 / Personalization Anchors
                                    </h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {ledger?.context_evidence?.map((item: string, i: number) => (
                                            <span key={i} style={{
                                                fontSize: '11px',
                                                padding: '4px 10px',
                                                background: 'rgba(214, 161, 75, 0.08)',
                                                border: '1px solid rgba(214, 161, 75, 0.2)',
                                                borderRadius: '16px',
                                                color: '#d6a14b',
                                                fontWeight: 500
                                            }}>
                                                {item}
                                            </span>
                                        )) || <p style={{ fontSize: '12px', color: '#636e7b' }}>No personal context identified.</p>}
                                    </div>
                                </section>

                                {/* Bucket 2: Market Signals */}
                                <section>
                                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#60a5fa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        02 / Scaled Market Signals
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {ledger?.market_signals?.map((signal: any, i: number) => (
                                            <div key={i} style={{
                                                padding: '12px',
                                                background: '#151821',
                                                border: '1px solid #1e222d',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#636e7b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {signal.label}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>{signal.score}</span>
                                                    <span style={{ fontSize: '10px', color: '#3d4452' }}>/ 10</span>
                                                </div>
                                                {/* Mini progress bar */}
                                                <div style={{ width: '100%', height: '2px', background: '#0a0b0f', marginTop: '8px', borderRadius: '1px' }}>
                                                    <div style={{ width: `${signal.score * 10}%`, height: '100%', background: '#60a5fa', borderRadius: '1px' }} />
                                                </div>
                                            </div>
                                        )) || <p style={{ fontSize: '12px', color: '#636e7b' }}>Market signals not yet evaluated.</p>}
                                    </div>
                                </section>

                                {/* Bucket 3: Trade-offs */}
                                <section>
                                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#e6e8eb', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        03 / Explicit Trade-offs
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#151821', border: '1px solid #1e222d', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px', borderBottom: '1px solid #1e222d' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginBottom: '8px', textTransform: 'uppercase' }}>Gains (ROI)</div>
                                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#a1a6b3' }}>
                                                {ledger?.trade_offs?.gains?.map((gain: string, i: number) => (
                                                    <li key={i} style={{ marginBottom: '4px' }}>{gain}</li>
                                                )) || <li>Competitive advantage in specified domain.</li>}
                                            </ul>
                                        </div>
                                        <div style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase' }}>Costs (Technical Debt/Effort)</div>
                                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#a1a6b3' }}>
                                                {ledger?.trade_offs?.costs?.map((cost: string, i: number) => (
                                                    <li key={i} style={{ marginBottom: '4px' }}>{cost}</li>
                                                )) || <li>Standard learning curve and integration time.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </section>

                                {/* Bucket 4: Decision Anchors */}
                                <section>
                                    <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        04 / Audit Decision Anchors
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '11px', color: '#636e7b', marginBottom: '4px' }}>
                                            Revisit this decision if any anchor is violated:
                                        </div>
                                        {ledger?.decision_anchors?.map((anchor: string, i: number) => (
                                            <div key={i} style={{
                                                padding: '10px 12px',
                                                background: 'rgba(248, 113, 113, 0.03)',
                                                border: '1px solid rgba(248, 113, 113, 0.15)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                gap: '10px',
                                                alignItems: 'flex-start'
                                            }}>
                                                <div style={{ marginTop: '2px', width: '12px', height: '12px', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: '3px' }} />
                                                <div style={{ fontSize: '11px', color: '#f87171', lineHeight: '1.4' }}>{anchor}</div>
                                            </div>
                                        )) || <p style={{ fontSize: '12px', color: '#636e7b' }}>No anchors set for this decision trajectory.</p>}
                                    </div>
                                </section>

                                {/* Footer: Metadata */}
                                <div style={{
                                    marginTop: '20px',
                                    paddingTop: '20px',
                                    borderTop: '1px solid #1e222d',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                        <span style={{ color: '#636e7b' }}>Audit Generated:</span>
                                        <span style={{ color: '#a1a6b3' }}>{new Date().toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                        <span style={{ color: '#636e7b' }}>Evidence Decay:</span>
                                        <span style={{ color: '#fbbf24' }}>Expires in 90 days</span>
                                    </div>
                                    <div style={{
                                        marginTop: '4px',
                                        padding: '8px',
                                        background: '#0a0b0f',
                                        borderRadius: '4px',
                                        fontSize: '9px',
                                        color: '#3d4452',
                                        lineHeight: '1.4',
                                        textAlign: 'center'
                                    }}>
                                        This ledger is a point-in-time calculation. Ecosystem changes may impact signal validity over time.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#e6e8eb', marginBottom: '16px', textTransform: 'uppercase' }}>
                            External Signals & Sources
                        </h3>
                        {sources.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {sources.map((source, i) => (
                                    <div key={i} style={{ paddingBottom: '16px', borderBottom: '1px solid #1e222d' }}>
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 500, color: '#60a5fa', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                                            {source.title}
                                        </a>
                                        <div style={{ fontSize: '10px', color: '#525c6a', marginBottom: '8px' }}>
                                            {source.domain} · {source.date}
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#8892a0', lineHeight: '1.5', margin: 0 }}>
                                            {source.snippet}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#636e7b' }}>
                                <p style={{ fontSize: '13px' }}>No direct evidence links found for this specific query.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'raw' && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ background: '#050608', border: '1px solid #1e222d', borderRadius: '8px', padding: '12px', overflowX: 'auto' }}>
                            <pre style={{ fontSize: '10px', color: '#636e7b', margin: 0, fontFamily: 'monospace' }}>
                                {JSON.stringify(verdict, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
