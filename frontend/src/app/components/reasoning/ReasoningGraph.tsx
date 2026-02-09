'use client';

import { useEffect, useState, useRef } from 'react';
import { ReasoningGraph as IReasoningGraph, GraphNode, GraphEdge } from '@/lib/reasoning-chain/generator';
import { Brain, ScrollText, AlertCircle, CheckCircle, ArrowRight, Database, Shield } from 'lucide-react';

interface ReasoningGraphProps {
    graph: IReasoningGraph;
    height?: number;
}

export function ReasoningGraph({ graph, height = 400 }: ReasoningGraphProps) {
    const [layout, setLayout] = useState<{ nodes: (GraphNode & { x: number, y: number })[], edges: GraphEdge[] }>({ nodes: [], edges: [] });
    const containerRef = useRef<HTMLDivElement>(null);

    // Simple auto-layout
    useEffect(() => {
        if (!graph || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const h = height;
        const padding = 40;

        // Group by type/level
        const levels: Record<string, GraphNode[]> = {
            'context': [],
            'source': [],
            'tool': [],
            'reasoning': [],
            'verdict': []
        };

        graph.nodes.forEach(n => {
            if (levels[n.type]) levels[n.type].push(n);
            else levels['reasoning'].push(n); // fallback
        });

        // Computed positions
        const computedNodes: (GraphNode & { x: number, y: number })[] = [];

        // Level 1: Context & Sources (Left)
        const inputs = [...levels.context, ...levels.source];
        inputs.forEach((n, i) => {
            computedNodes.push({
                ...n,
                x: padding,
                y: padding + i * 80
            });
        });

        // Level 2: Reasoning Chain (Middle)
        // & Tools (Bottom Middle)
        const chain = levels.reasoning;
        chain.forEach((n, i) => {
            computedNodes.push({
                ...n,
                x: width * 0.4,
                y: padding + i * 100
            });
        });

        const tools = levels.tool;
        tools.forEach((n, i) => {
            computedNodes.push({
                ...n,
                x: width * 0.4,
                y: h - padding - (i * 70)
            });
        });

        // Level 3: Verdict (Right)
        if (levels.verdict.length > 0) {
            computedNodes.push({
                ...levels.verdict[0],
                x: width - padding - 100, // wider node
                y: h / 2
            });
        }

        setLayout({ nodes: computedNodes, edges: graph.edges });

    }, [graph, height]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                height: `${height}px`,
                background: '#0f1115',
                border: '1px solid #222632',
                borderRadius: '12px',
                overflow: 'hidden'
            }}
        >
            <h3 style={{
                position: 'absolute',
                top: 16,
                left: 16,
                fontSize: '14px',
                fontWeight: 600,
                color: '#a1a6b3',
                zIndex: 10
            }}>
                Reasoning Trace
            </h3>

            {/* SVG Layer for Edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
                    </marker>
                </defs>
                {layout.edges.map((edge, i) => {
                    const source = layout.nodes.find(n => n.id === edge.source);
                    const target = layout.nodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    return (
                        <g key={edge.id} className="animate-fade-in" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                            <path
                                d={`M ${source.x + 20} ${source.y + 20} C ${source.x + 100} ${source.y + 20}, ${target.x - 100} ${target.y + 20}, ${target.x} ${target.y + 20}`}
                                fill="none"
                                stroke="#334155"
                                strokeWidth="1.5"
                                markerEnd="url(#arrowhead)"
                                strokeDasharray={edge.type === 'sourced_from' ? '4 4' : 'none'}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* HTML Layer for Nodes */}
            {layout.nodes.map((node, i) => (
                <div
                    key={node.id}
                    className="animate-fade-in"
                    style={{
                        position: 'absolute',
                        left: node.x,
                        top: node.y,
                        transform: 'translate(-0%, -0%)', // Anchor top-left mostly, but let's adjust center? No keep simple.
                        width: node.type === 'verdict' ? '220px' : '200px',
                        padding: '12px',
                        background: getNodeColor(node.type),
                        border: `1px solid ${getNodeBorder(node.type)}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#e6e8eb',
                        boxShadow: node.type === 'verdict' ? '0 0 20px rgba(214, 161, 75, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                        zIndex: 2,
                        transition: 'all 0.3s ease',
                        cursor: 'default',
                        animationDelay: `${i * 0.15}s`,
                        animationFillMode: 'both'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {getNodeIcon(node.type)}
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', opacity: 0.8 }}>
                            {node.type}
                        </span>
                    </div>
                    <div style={{ lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {node.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

function getNodeColor(type: string) {
    switch (type) {
        case 'verdict': return '#1a1d26'; // Dark
        case 'reasoning': return '#1e293b'; // Slate
        case 'context': return '#1a1a1a';
        case 'tool': return '#172033'; // Blue-ish dark
        default: return '#151821';
    }
}

function getNodeBorder(type: string) {
    switch (type) {
        case 'verdict': return '#d6a14b'; // Gold
        case 'reasoning': return '#475569';
        case 'tool': return '#3b82f6'; // Blue
        case 'context': return '#333';
        default: return '#333';
    }
}

function getNodeIcon(type: string) {
    switch (type) {
        case 'verdict': return <Shield size={14} color="#d6a14b" />;
        case 'reasoning': return <Brain size={14} color="#94a3b8" />;
        case 'context': return <ScrollText size={14} color="#666" />;
        case 'tool': return <Database size={14} color="#60a5fa" />;
        default: return <ArrowRight size={14} />;
    }
}
