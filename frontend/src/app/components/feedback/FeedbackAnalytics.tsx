'use client';

import { useState, useEffect } from 'react';
import { getFeedbackStats } from '@/lib/actions/feedback';
import { FeedbackStats } from '@/lib/types/feedback';

export function FeedbackAnalytics() {
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getFeedbackStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch feedback stats", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return <div style={{ color: '#a1a6b3', fontSize: '13px' }}>Loading analytics...</div>;
    if (!stats) return <div style={{ color: '#a1a6b3', fontSize: '13px' }}>No feedback data yet</div>;

    const accuracy = stats.totalFeedback > 0
        ? Math.round(((stats.tagDistribution?.isCorrect || 0) / stats.totalFeedback) * 100)
        : 0;

    return (
        <div style={{
            padding: '24px',
            background: '#151821',
            border: '1px solid #222632',
            borderRadius: '12px',
            color: '#e6e8eb'
        }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                Feedback Analytics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Accuracy Card */}
                <div style={{ padding: '16px', background: '#0f1115', borderRadius: '8px', border: '1px solid #222632' }}>
                    <div style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>Accuracy Score</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: accuracy > 80 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }}>
                        {accuracy}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Based on {stats.totalFeedback} reviews
                    </div>
                </div>

                {/* Adjustment Factor */}
                <div style={{ padding: '16px', background: '#0f1115', borderRadius: '8px', border: '1px solid #222632' }}>
                    <div style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>Confidence Adj.</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#60a5fa' }}>
                        {parseFloat(stats.averageAdjustment) > 0 ? '+' : ''}{stats.averageAdjustment}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Avg. correction
                    </div>
                </div>
            </div>

            {/* Common Issues */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#a1a6b3' }}>
                    Common Issues
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.mostCommonIssues && stats.mostCommonIssues.length > 0 ? (
                        stats.mostCommonIssues.map((issue) => (
                            <div key={issue} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: '#0f1115',
                                borderRadius: '6px',
                                border: '1px solid #222632'
                            }}>
                                <span style={{ fontSize: '13px' }}>{issue}</span>
                                <span style={{ fontSize: '12px', color: '#a1a6b3' }}>
                                    {stats.issueFrequency[issue] || 0} reports
                                </span>
                            </div>
                        ))
                    ) : (
                        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                            No issues reported yet
                        </div>
                    )}
                </div>
            </div>

            {/* Accuracy Trend (Placeholder for Chart) */}
            <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#a1a6b3' }}>
                    Recent Accuracy
                </h4>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '4px',
                    height: '60px',
                    padding: '10px',
                    background: '#0f1115',
                    borderRadius: '8px',
                    border: '1px solid #222632'
                }}>
                    {(stats.accuracyTrend || []).map((val, i) => (
                        <div key={i} style={{
                            flex: 1,
                            background: val ? '#4ade80' : '#f87171',
                            height: val ? '80%' : '20%',
                            borderRadius: '2px',
                            opacity: 0.7
                        }} title={val ? 'Helpful' : 'Not Helpful'} />
                    ))}
                    {(!stats.accuracyTrend || stats.accuracyTrend.length === 0) && (
                        <div style={{ fontSize: '12px', color: '#666', width: '100%', textAlign: 'center' }}>No data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
