'use client';

import { useState } from 'react';

export interface FeedbackRequest {
    helpful: boolean;
    tags: {
        isTooOptimistic: boolean;
        isTooConservative: boolean;
        hasWrongAssumption: boolean;
        missingContext: boolean;
        isCorrect: boolean;
    };
    corrections?: {
        verdict?: 'pursue' | 'explore' | 'watchlist' | 'ignore';
        confidence?: number;
        timeline?: string;
    };
    comment?: string;
}

interface VerdictCardProps {
    verdict: {
        id?: string;
        verdict: string;
        confidence: number;
        timeline: string;
        reasoning: string;
        actionItems: (string | { text: string })[];
        reasonCodes: string[];
    };
    onSave?: () => void;
    onStartFocus?: () => void;
    onFeedback?: (feedback: FeedbackRequest) => void;
    feedbackGiven?: FeedbackRequest | null;
}

export function VerdictCard({ verdict, onSave, onStartFocus, onFeedback, feedbackGiven }: VerdictCardProps) {
    const [feedbackState, setFeedbackState] = useState({
        isTooOptimistic: false,
        isTooConservative: false,
        hasWrongAssumption: false,
        missingContext: false,
        isCorrect: false,
    });

    const [corrections, setCorrections] = useState({
        verdict: verdict.verdict as any,
        confidence: verdict.confidence,
        timeline: verdict.timeline || '',
    });

    const [comment, setComment] = useState("");
    const [showCorrectionForm, setShowCorrectionForm] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleTagToggle = (tag: keyof typeof feedbackState) => {
        setFeedbackState(prev => {
            const newState = { ...prev, [tag]: !prev[tag] };
            // If "wrong assumption" is checked, show correction form
            if (tag === 'hasWrongAssumption') {
                setShowCorrectionForm(!prev.hasWrongAssumption);
            }
            return newState;
        });
    };

    const handleSubmitFeedback = async () => {
        if (!onFeedback) return;

        setIsSubmittingFeedback(true);
        // Simulate small delay for feel
        await new Promise(r => setTimeout(r, 600));

        onFeedback({
            helpful: feedbackState.isCorrect || (!feedbackState.isTooOptimistic && !feedbackState.isTooConservative && !feedbackState.hasWrongAssumption && !feedbackState.missingContext),
            tags: feedbackState,
            corrections: showCorrectionForm ? corrections : undefined,
            comment: comment
        });

        setIsSubmittingFeedback(false);
        // Don't reset state immediately so user sees what they submitted or we can show success state
    };

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
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <span>🎯</span> Start Focus
                    {verdict.actionItems && verdict.actionItems.length > 0 && (
                        <span style={{ opacity: 0.7, fontSize: '12px' }}>
                            ({verdict.actionItems.length})
                        </span>
                    )}
                </button>
            </div>

            {/* Feedback Section */}
            {onFeedback && (
                <div style={{
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid #222632',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e6e8eb', marginBottom: '16px' }}>
                        How accurate is this analysis?
                    </h3>

                    {/* Feedback Tags */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                        {[
                            { key: 'isCorrect', label: '👍 Correct', color: '#4ade80' },
                            { key: 'isTooOptimistic', label: '📈 Too optimistic', color: '#fbbf24' },
                            { key: 'isTooConservative', label: '📉 Too conservative', color: '#fbbf24' },
                            { key: 'hasWrongAssumption', label: '⚠️ Wrong assumption', color: '#f87171' },
                            { key: 'missingContext', label: '🔍 Missing context', color: '#60a5fa' },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => handleTagToggle(key as keyof typeof feedbackState)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: `1px solid ${feedbackState[key as keyof typeof feedbackState] ? color : '#222632'}`,
                                    background: feedbackState[key as keyof typeof feedbackState] ? `${color}20` : '#0f1115',
                                    color: feedbackState[key as keyof typeof feedbackState] ? color : '#a1a6b3',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Correction Form */}
                    {showCorrectionForm && (
                        <div style={{
                            marginBottom: '20px',
                            padding: '16px',
                            background: '#1a202c',
                            borderRadius: '8px',
                            border: '1px solid #2d3748'
                        }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#e6e8eb', marginBottom: '12px' }}>
                                What should the correct analysis be?
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#a1a6b3', marginBottom: '4px' }}>Verdict</label>
                                    <select
                                        value={corrections.verdict}
                                        onChange={(e) => setCorrections({ ...corrections, verdict: e.target.value as any })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            background: '#0f1115',
                                            border: '1px solid #222632',
                                            borderRadius: '6px',
                                            color: '#e6e8eb',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="pursue">Pursue</option>
                                        <option value="explore">Explore</option>
                                        <option value="watchlist">Watchlist</option>
                                        <option value="ignore">Ignore</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#a1a6b3', marginBottom: '4px' }}>Confidence</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={corrections.confidence}
                                            onChange={(e) => setCorrections({ ...corrections, confidence: parseInt(e.target.value) })}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ fontSize: '13px', color: '#e6e8eb', minWidth: '30px' }}>
                                            {corrections.confidence}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comment */}
                    <div style={{ marginBottom: '16px' }}>
                        <textarea
                            placeholder="Additional comments (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                color: '#e6e8eb',
                                fontSize: '13px',
                                minHeight: '80px',
                                resize: 'vertical',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmitFeedback}
                        disabled={isSubmittingFeedback || Object.values(feedbackState).every(v => !v)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isSubmittingFeedback || Object.values(feedbackState).every(v => !v) ? 'not-allowed' : 'pointer',
                            opacity: isSubmittingFeedback || Object.values(feedbackState).every(v => !v) ? 0.6 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback & Help Axiom Learn'}
                    </button>

                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '12px' }}>
                        Your feedback adjusts Axiom's confidence and improves future analyses
                    </p>
                </div>
            )}
        </div>
    );
}

