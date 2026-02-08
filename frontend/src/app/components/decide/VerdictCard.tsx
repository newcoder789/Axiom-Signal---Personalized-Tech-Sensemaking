'use client';

import { useState } from 'react';

interface VerdictCardProps {
    verdict: {
        verdict: string;
        confidence: number;
        timeline: string;
        reasoning: string;
        actionItems: (string | { text: string })[];
        reasonCodes: string[];
    };
    onSave?: () => void;
    onStartFocus?: () => void;
    onFeedback?: (feedback: 'helpful' | 'not-helpful') => void;
    feedbackGiven?: 'helpful' | 'not-helpful' | null;
}

export function VerdictCard({ verdict, onSave, onStartFocus, onFeedback, feedbackGiven }: VerdictCardProps) {
    const getVerdictColor = (v: string) => {
        const colors: Record<string, string> = {
            pursue: '#60a5fa',
            explore: '#fbbf24',
            watchlist: '#a1a6b3',
            ignore: '#666',
        };
        return colors[v] || '#666';
    };

    return (
        <div style={{
            padding: '24px',
            background: '#151821',
            border: '1px solid #222632',
            borderRadius: '12px',
            marginBottom: '24px'
        }}>
            {/* Header - Verdict + Confidence */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <span style={{
                    padding: '8px 20px',
                    background: getVerdictColor(verdict.verdict) + '30',
                    color: getVerdictColor(verdict.verdict),
                    borderRadius: '20px',
                    fontSize: '16px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    {verdict.verdict}
                </span>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: '#e6e8eb' }}>
                        {verdict.confidence}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#a1a6b3' }}>
                        confidence
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {verdict.timeline && (
                <div style={{
                    padding: '12px 16px',
                    background: '#0f1115',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <span style={{ fontSize: '13px', color: '#a1a6b3' }}>Timeline: </span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#e6e8eb' }}>
                        {verdict.timeline}
                    </span>
                </div>
            )}

            {/* Reasoning */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#e6e8eb',
                    marginBottom: '10px'
                }}>
                    Reasoning
                </h4>
                <p style={{
                    fontSize: '15px',
                    lineHeight: 1.7,
                    color: '#a1a6b3'
                }}>
                    {verdict.reasoning}
                </p>
            </div>

            {/* Reason Codes */}
            {verdict.reasonCodes && verdict.reasonCodes.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '20px'
                }}>
                    {verdict.reasonCodes.map((code, i) => (
                        <span key={i} style={{
                            padding: '4px 12px',
                            background: '#222632',
                            color: '#fbbf24',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 500
                        }}>
                            ⚠️ {code.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            )}

            {/* Action Items */}
            {verdict.actionItems && verdict.actionItems.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#e6e8eb',
                        marginBottom: '10px'
                    }}>
                        Action Items
                    </h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {verdict.actionItems.map((item, i) => (
                            <li key={i} style={{
                                fontSize: '14px',
                                color: '#a1a6b3',
                                paddingLeft: '4px'
                            }}>
                                • {typeof item === 'string' ? item : item.text || JSON.stringify(item)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                    onClick={onSave}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: '#d6a14b',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Save Decision
                </button>
                <button
                    onClick={onStartFocus}
                    style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        color: '#e6e8eb',
                        border: '1px solid #222632',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    Start Focus
                </button>
            </div>

            {/* Feedback Buttons */}
            {onFeedback && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #222632',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '12px', color: '#a1a6b3', marginRight: '8px' }}>
                        Was this helpful?
                    </span>
                    <button
                        onClick={() => onFeedback('helpful')}
                        style={{
                            padding: '8px 16px',
                            background: feedbackGiven === 'helpful' ? '#4ade8020' : 'transparent',
                            border: `1px solid ${feedbackGiven === 'helpful' ? '#4ade80' : '#222632'}`,
                            borderRadius: '6px',
                            color: feedbackGiven === 'helpful' ? '#4ade80' : '#a1a6b3',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        👍 Yes
                    </button>
                    <button
                        onClick={() => onFeedback('not-helpful')}
                        style={{
                            padding: '8px 16px',
                            background: feedbackGiven === 'not-helpful' ? '#f8717120' : 'transparent',
                            border: `1px solid ${feedbackGiven === 'not-helpful' ? '#f87171' : '#222632'}`,
                            borderRadius: '6px',
                            color: feedbackGiven === 'not-helpful' ? '#f87171' : '#a1a6b3',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        👎 No
                    </button>
                </div>
            )}
        </div>
    );
}
