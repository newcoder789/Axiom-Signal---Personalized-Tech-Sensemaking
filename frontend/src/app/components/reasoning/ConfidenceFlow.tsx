'use client';

import { useEffect, useState } from 'react';
import { traceConfidenceFlow } from '@/lib/provenance/tracker';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConfidencePoint {
    tool: string;
    confidence: number;
    timestamp: Date;
}

interface ConfidenceFlowProps {
    thoughtId: string;
    // Optional: pass data directly if available to avoid fetch
    initialData?: ConfidencePoint[];
}

export function ConfidenceFlow({ thoughtId, initialData }: ConfidenceFlowProps) {
    const [data, setData] = useState<ConfidencePoint[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) return;

        async function fetchData() {
            try {
                // In a real app we'd call a server action that calls traceConfidenceFlow
                // For now, let's mock or use a prop, as traceConfidenceFlow is server-side
                // We'll assume the parent component fetches it or we mock it for the demo
                const mockData = [
                    { tool: 'Initial Assessment', confidence: 0.5, timestamp: new Date(Date.now() - 5000) },
                    { tool: 'Market Analysis', confidence: 0.7, timestamp: new Date(Date.now() - 4000) },
                    { tool: 'Risk Check', confidence: 0.65, timestamp: new Date(Date.now() - 3000) },
                    { tool: 'Technical Viability', confidence: 0.85, timestamp: new Date(Date.now() - 2000) },
                    { tool: 'Final Verdict', confidence: 0.82, timestamp: new Date(Date.now() - 1000) },
                ];
                setData(mockData);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [thoughtId, initialData]);

    if (loading) return <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '13px' }}>Loading flow...</div>;

    if (data.length === 0) return <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '13px' }}>No confidence data</div>;

    // SVG Dimensions
    const width = 600;
    const height = 150;
    const padding = 20;

    // Scale properties
    const maxConf = 1.0;
    const minConf = 0.0;
    const xScale = (width - padding * 2) / (data.length - 1);
    const yScale = (height - padding * 2) / (maxConf - minConf);

    // Points for polyline
    const points = data.map((d, i) => {
        const x = padding + i * xScale;
        const y = height - padding - (d.confidence * yScale);
        return `${x},${y}`;
    }).join(' ');

    const lastPoint = data[data.length - 1];
    const firstPoint = data[0];
    const trend = lastPoint.confidence - firstPoint.confidence;

    return (
        <div style={{
            padding: '20px',
            background: '#151821',
            border: '1px solid #222632',
            borderRadius: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e6e8eb' }}>
                    Confidence Evolution
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    {trend > 0.1 ? <TrendingUp size={14} color="#4ade80" /> :
                        trend < -0.1 ? <TrendingDown size={14} color="#f87171" /> :
                            <Minus size={14} color="#94a3b8" />}
                    <span style={{ color: trend > 0 ? '#4ade80' : trend < -0.1 ? '#f87171' : '#94a3b8' }}>
                        {currentConfidenceLabel(lastPoint.confidence)}
                    </span>
                </div>
            </div>

            <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(val => (
                        <line
                            key={val}
                            x1={padding}
                            y1={height - padding - (val * yScale)}
                            x2={width - padding}
                            y2={height - padding - (val * yScale)}
                            stroke="#222632"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* The Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                    />

                    {/* Area under the line (optional gradient) */}
                    <defs>
                        <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <polygon
                        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                        fill="url(#areaGradient)"
                    />

                    {/* Points */}
                    {data.map((d, i) => {
                        const x = padding + i * xScale;
                        const y = height - padding - (d.confidence * yScale);
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill="#0f1115"
                                stroke="#60a5fa"
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>

                {/* Tooltips / Labels */}
                {data.map((d, i) => {
                    const x = padding + i * xScale; // Need to map to percent for HTML overlay
                    const leftPercent = (i / (data.length - 1)) * 100;

                    // Only show simpler labels
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `calc(${leftPercent}% - 0px)`, // simple centering approximation
                                bottom: '-20px',
                                fontSize: '10px',
                                color: '#666',
                                transform: 'translateX(-50%)',
                                width: '60px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                            title={d.tool}
                        >
                            {d.tool}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function currentConfidenceLabel(conf: number) {
    if (conf >= 0.8) return 'High Confidence';
    if (conf >= 0.5) return 'Moderate';
    return 'Low Confidence';
}
