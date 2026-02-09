'use client';

import { useEffect, useState } from 'react';
import { getProvenance } from '@/lib/provenance/tracker';
import { Terminal, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TraceItem {
    id: string;
    toolName: string;
    executionOrder: number;
    success: boolean;
    executionTimeMs?: number;
    createdAt: Date;
    outputConfidence?: string;
}

export function UserPath({ thoughtId }: { thoughtId: string }) {
    const [traces, setTraces] = useState<TraceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTraces() {
            try {
                // Mock data for now as we don't have the API route exposed yet
                // In production: const data = await getProvenance(thoughtId);
                const mockTraces: TraceItem[] = [
                    { id: '1', toolName: 'ProfileAnalysis', executionOrder: 1, success: true, executionTimeMs: 120, createdAt: new Date(Date.now() - 5000), outputConfidence: '0.9' },
                    { id: '2', toolName: 'SearchComparisons', executionOrder: 2, success: true, executionTimeMs: 850, createdAt: new Date(Date.now() - 4000), outputConfidence: '0.85' },
                    { id: '3', toolName: 'GitHubTrendScraper', executionOrder: 3, success: true, executionTimeMs: 1200, createdAt: new Date(Date.now() - 3000), outputConfidence: '0.8' },
                    { id: '4', toolName: 'RiskAssessor', executionOrder: 4, success: true, executionTimeMs: 45, createdAt: new Date(Date.now() - 2000), outputConfidence: '0.75' },
                    { id: '5', toolName: 'Synthesizer', executionOrder: 5, success: true, executionTimeMs: 300, createdAt: new Date(Date.now() - 1000), outputConfidence: '0.92' },
                ];
                setTraces(mockTraces);
            } finally {
                setLoading(false);
            }
        }
        fetchTraces();
    }, [thoughtId]);

    if (loading) return <div style={{ fontSize: '13px', color: '#666' }}>Loading traces...</div>;

    return (
        <div style={{
            padding: '20px',
            background: '#151821',
            border: '1px solid #222632',
            borderRadius: '12px'
        }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e6e8eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} color="#a1a6b3" />
                Execution Trace
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {traces.map((trace, i) => (
                    <div key={trace.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        {/* Timeline Line */}
                        {i < traces.length - 1 && (
                            <div style={{
                                position: 'absolute',
                                left: '11px',
                                top: '24px',
                                bottom: '-12px',
                                width: '1px',
                                background: '#222632'
                            }} />
                        )}

                        {/* Icon */}
                        <div style={{ zIndex: 1 }}>
                            {trace.success ?
                                <CheckCircle2 size={24} color="#22c55e" fill="#151821" /> :
                                <XCircle size={24} color="#ef4444" fill="#151821" />
                            }
                        </div>

                        {/* Content */}
                        <div style={{ paddingBottom: '24px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '14px', color: '#e6e8eb', fontWeight: 500 }}>
                                        {trace.toolName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                        Step {trace.executionOrder} • {new Date(trace.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {trace.outputConfidence && (
                                        <div style={{ fontSize: '12px', color: '#a1a6b3', background: '#0f1115', padding: '2px 6px', borderRadius: '4px', border: '1px solid #222632' }}>
                                            {(Number(trace.outputConfidence) * 100).toFixed(0)}% conf
                                        </div>
                                    )}
                                    {trace.executionTimeMs && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#666' }}>
                                            <Clock size={12} />
                                            {trace.executionTimeMs}ms
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
