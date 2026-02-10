'use client';

import { useEffect, useState } from 'react';

interface Insight {
    icon: string;
    title: string;
    description: string;
    color: string;
}

interface InsightsSectionProps {
    decisions: any[];
}

export function InsightsSection({ decisions }: InsightsSectionProps) {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [evolution, setEvolution] = useState<any>(null);

    useEffect(() => {
        const fetchEvolution = async () => {
            try {
                const resp = await fetch('http://localhost:8000/api/debug/state');
                if (resp.ok) {
                    const data = await resp.json();
                    setEvolution(data.evolution);
                }
            } catch (err) {
                console.error("Failed to fetch evolution:", err);
            }
        };
        fetchEvolution();
    }, []);

    useEffect(() => {
        // Simple logic to generate "Meta-Insights" for the demo
        const newInsights: Insight[] = [];

        if (decisions.length > 0) {
            // Pattern 1: Decision Velocity
            newInsights.push({
                icon: '⚡',
                title: 'High Momentum',
                description: `You've evaluated ${decisions.length} technologies this week. Your "Pursue" rate is ${Math.round((decisions.filter(d => d.verdict === 'pursue').length / decisions.length) * 100)}%.`,
                color: 'var(--accent-green)'
            });

            // Pattern 2: Risk Profile (Mocked logic)
            const hasWatchlist = decisions.some(d => d.verdict === 'watchlist');
            newInsights.push({
                icon: '⚖️',
                title: 'Prudent Explorer',
                description: hasWatchlist
                    ? 'You tend to place emerging tech on Watchlists rather than ignoring them. This builds a strong future-radar.'
                    : 'You are currently focusing on high-certainty technologies. Consider exploring more speculative signals.',
                color: 'var(--accent-blue)'
            });

            // Pattern 3: The "Skill Pivot" (Demo case specific)
            if (decisions.some(d => d.title.toLowerCase().includes('react') || d.title.toLowerCase().includes('svelte'))) {
                newInsights.push({
                    icon: '🎯',
                    title: 'Frontend Evolution',
                    description: 'Axiom detects a shift in your frontend focus. You are moving from runtime-heavy to compile-time optimizations.',
                    color: 'var(--accent-gold)'
                });
            }
        }

        // Add Evolution Insight
        if (evolution) {
            const score = evolution.score;
            let evolutionInsight: Insight;

            if (score > 0.7) {
                evolutionInsight = {
                    icon: '🚀',
                    title: 'Sync Level: High',
                    description: `Agent strategy set to "${evolution.strategy}". We are deeply synchronized with your technical signal.`,
                    color: 'var(--accent-gold)'
                };
            } else if (score < 0.3) {
                evolutionInsight = {
                    icon: '🧊',
                    title: 'Sync Level: Low',
                    description: 'The agent is operating in "Concise" mode to stay out of your way until more signals are captured.',
                    color: 'var(--text-tertiary)'
                };
            } else {
                evolutionInsight = {
                    icon: '🧠',
                    title: 'Sync Level: Standard',
                    description: 'Maintaining a balanced posture. Interaction helps sharpen the technical sensemaking window.',
                    color: 'var(--accent-blue)'
                };
            }
            newInsights.unshift(evolutionInsight);
        }

        if (newInsights.length === 0) {
            newInsights.push({
                icon: '💡',
                title: 'Ready for Analysis',
                description: 'Start capturing thoughts to see cross-decision patterns and behavioral insights.',
                color: 'var(--text-tertiary)'
            });
        }

        setInsights(newInsights);
    }, [decisions, evolution]);

    return (
        <div className="card card-premium" style={{ padding: "24px" }}>
            <div className="label mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
                Meta-Reasoning Insights
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {insights.map((insight, i) => (
                    <div
                        key={i}
                        className="glass"
                        style={{
                            display: "flex",
                            gap: "12px",
                            padding: "16px",
                            borderRadius: "12px",
                            borderLeft: `4px solid ${insight.color}`
                        }}
                    >
                        <span style={{ fontSize: "20px", flexShrink: 0 }}>{insight.icon}</span>
                        <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                                {insight.title}
                            </h4>
                            <p className="caption" style={{ lineHeight: 1.5 }}>
                                {insight.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
