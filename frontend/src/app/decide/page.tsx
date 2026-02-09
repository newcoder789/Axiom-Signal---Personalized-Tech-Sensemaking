'use client';

import { useState } from 'react';
import { VerdictCard, FeedbackRequest } from '../components/decide/VerdictCard';
import { EvidencePanel } from '../components/decide/EvidencePanel';
import { SaveDecisionDialog } from '../components/decide/SaveDecisionDialog';
import { errorToast, successToast } from '@/lib/toast';
import { VerdictSkeleton } from '../components/Loading';

import { persistVerdict } from '@/lib/actions';
import { submitFeedback } from '@/lib/actions/feedback';
import { FocusSession } from '../components/focus/FocusSession';
import { ReasoningGraph } from '../components/reasoning/ReasoningGraph';
import { ConfidenceFlow } from '../components/reasoning/ConfidenceFlow';
import { generateReasoningGraph } from '@/lib/reasoning-chain/generator';

export default function DecidePageNew() {
    const [topic, setTopic] = useState('');
    const [currentStatus, setCurrentStatus] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [profile, setProfile] = useState<'Backend dev' | 'ML dev' | 'Student' | 'Founder' | 'Custom'>('Backend dev');
    const [customProfile, setCustomProfile] = useState('');
    const [experience, setExperience] = useState('2 years');
    const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');

    const [verdict, setVerdict] = useState<any>(null);
    const [toolEvidence, setToolEvidence] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<FeedbackRequest | null>(null);
    const [isDemo, setIsDemo] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);

    const handleFeedback = async (feedback: FeedbackRequest | null) => {
        setFeedbackGiven(feedback);
        if (!feedback || !verdict) return;

        try {
            let thoughtId = verdict.id;

            // If transient verdict (no ID), save it first
            if (!thoughtId) {
                const savedThought = await persistVerdict({
                    ...verdict,
                    topic, // Ensure topic is passed if not in verdict
                    user_profile: profile,
                    risk_tolerance: riskTolerance,
                    additional_notes: additionalNotes,
                    current_status: currentStatus
                });
                thoughtId = savedThought.id;
                // Update local verdict with ID so subsequent actions work
                setVerdict((prev: any) => ({ ...prev, id: thoughtId }));
            }

            if (thoughtId) {
                await submitFeedback({
                    thoughtId,
                    ...feedback
                });
                successToast('Feedback submitted');
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            errorToast('Failed to save feedback');
        }
    };

    const handleAnalyze = async () => {
        if (!topic.trim()) {
            errorToast('Please enter a topic to analyze');
            return;
        }

        setIsAnalyzing(true);
        setVerdict(null);
        setFeedbackGiven(null); // Reset feedback on new analysis
        try {
            const response = await fetch('/api/verdict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    current_status: currentStatus,
                    additional_notes: additionalNotes,
                    user_profile: profile === 'Custom' ? customProfile : profile,
                    experience_level: experience,
                    risk_tolerance: riskTolerance
                })
            });

            if (response.ok) {
                const data = await response.json();
                setVerdict(data);
                setToolEvidence(data.tool_evidence);
                setIsDemo(data.isDemo || false);
                if (data.isDemo) {
                    successToast('Demo verdict generated');
                } else {
                    successToast('Analysis complete');
                }
            } else {
                errorToast('Analysis failed. Please try again.');
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            errorToast('Network error. Please check your connection.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        setShowSaveDialog(true);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f1115' }}>
            {/* Left Sidebar */}
            <div style={{
                width: '240px',
                borderRight: '1px solid #222632',
                background: '#151821',
                padding: '20px'
            }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e6e8eb', marginBottom: '20px' }}>
                    Quick Settings
                </h2>

                {/* Profile Presets */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                        Profile
                    </label>
                    {['Backend dev', 'ML dev', 'Student', 'Founder', 'Custom'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setProfile(p as any)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                marginBottom: '6px',
                                background: profile === p ? '#222632' : 'transparent',
                                border: `1px solid ${profile === p ? '#d6a14b' : '#222632'}`,
                                borderRadius: '6px',
                                color: profile === p ? '#e6e8eb' : '#a1a6b3',
                                fontSize: '13px',
                                textAlign: 'left',
                                cursor: 'pointer'
                            }}
                        >
                            {p}
                        </button>
                    ))}

                    {profile === 'Custom' && (
                        <div style={{ marginTop: '12px' }}>
                            <textarea
                                value={customProfile}
                                onChange={(e) => setCustomProfile(e.target.value)}
                                placeholder="Describe your background (e.g., 'Senior Cloud Architect with Go/K8s focus')"
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#0f1115',
                                    border: '1px solid #222632',
                                    borderRadius: '6px',
                                    color: '#e6e8eb',
                                    fontSize: '12px',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Recent Decisions */}
                <div>
                    <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                        Recent Decisions
                    </label>
                    <div style={{ fontSize: '12px', color: '#666', padding: '12px', background: '#0f1115', borderRadius: '6px' }}>
                        No recent decisions
                    </div>
                </div>
            </div>

            {/* Center Workbench */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e6e8eb', marginBottom: '32px' }}>
                        Decision Workbench
                    </h1>

                    {/* Context Form */}
                    <div style={{
                        padding: '20px',
                        background: '#151821',
                        border: '1px solid #222632',
                        borderRadius: '12px',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            {/* Topic */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                                    Topic
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Rust for backend services"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        color: '#e6e8eb',
                                        fontSize: '15px',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#d6a14b'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#222632'}
                                />
                            </div>

                            {/* Current Status */}
                            <div>
                                <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                                    Current Status
                                </label>
                                <select
                                    value={currentStatus}
                                    onChange={(e) => setCurrentStatus(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        color: '#e6e8eb',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select status...</option>
                                    <option value="researching">Researching</option>
                                    <option value="planning">Planning</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="evaluating">Evaluating</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            {/* Additional Notes */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                                    Additional Context/Notes (Optional)
                                </label>
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="Any constraints, deadlines, or specific concerns?"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        color: '#e6e8eb',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#d6a14b'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#222632'}
                                />
                            </div>

                            {/* Experience */}
                            <div>
                                <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                                    Experience
                                </label>
                                <select
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        color: '#e6e8eb',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option>0-1 years</option>
                                    <option>2 years</option>
                                    <option>3-5 years</option>
                                    <option>5+ years</option>
                                </select>
                            </div>

                            {/* Risk Tolerance */}
                            <div>
                                <label style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px', display: 'block' }}>
                                    Risk Tolerance
                                </label>
                                <select
                                    value={riskTolerance}
                                    onChange={(e) => setRiskTolerance(e.target.value as any)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#0f1115',
                                        border: '1px solid #222632',
                                        borderRadius: '8px',
                                        color: '#e6e8eb',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="low">Low (Conservative)</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High (Aggressive)</option>
                                </select>
                            </div>

                            {/* Analyze Button */}
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!topic.trim() || isAnalyzing}
                                    style={{
                                        width: '100%',
                                        padding: '12px 24px',
                                        background: '#d6a14b',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        cursor: !topic.trim() || isAnalyzing ? 'not-allowed' : 'pointer',
                                        opacity: !topic.trim() || isAnalyzing ? 0.5 : 1
                                    }}
                                >
                                    {isAnalyzing ? '⏳ Analyzing...' : '→ Analyze'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {isAnalyzing && (
                        <VerdictSkeleton />
                    )}

                    {/* Demo Mode Indicator */}
                    {verdict && isDemo && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(234, 179, 8, 0.1)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '16px' }}>🎭</span>
                            <span style={{ color: '#eab308', fontSize: '13px' }}>
                                Demo Mode - Connect Python backend for real AI analysis
                            </span>
                        </div>
                    )}

                    {/* Focus Session Mode */}
                    {isFocusMode && verdict && (
                        <div style={{ marginBottom: '24px' }}>
                            <button
                                onClick={() => setIsFocusMode(false)}
                                style={{
                                    marginBottom: '16px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#a1a6b3',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                ← Back to Decision
                            </button>
                            <FocusSession
                                thoughtId={verdict.id}
                                initialActionItems={
                                    verdict.actionItems?.map((item: any, i: number) => ({
                                        id: `item-${i}`, // simplified generation if no IDs
                                        text: typeof item === 'string' ? item : item.text,
                                        completed: item.completed || false
                                    })) || []
                                }
                                onSessionComplete={() => {
                                    setIsFocusMode(false);
                                    // Optionally refresh verdict to show progress?
                                }}
                            />
                        </div>
                    )}

                    {/* Verdict Card */}
                    {verdict && !isAnalyzing && !isFocusMode && (
                        <>
                            <VerdictCard
                                verdict={verdict}
                                onSave={handleSave}
                                onStartFocus={() => setIsFocusMode(true)}
                                onFeedback={handleFeedback}
                                feedbackGiven={feedbackGiven}
                            />

                            {/* Analysis Deep Dive */}
                            <div style={{ marginTop: '32px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#e6e8eb', marginBottom: '16px' }}>
                                    Analysis Deep Dive
                                </h3>

                                <div style={{ display: 'grid', gap: '24px' }}>
                                    {/* Reasoning Graph */}
                                    <div>
                                        <div style={{ fontSize: '14px', color: '#a1a6b3', marginBottom: '12px' }}>
                                            Reasoning Architecture
                                        </div>
                                        <ReasoningGraph
                                            graph={generateReasoningGraph(verdict)}
                                            height={350}
                                        />
                                    </div>

                                    {/* Confidence Flow */}
                                    <div>
                                        <div style={{ fontSize: '14px', color: '#a1a6b3', marginBottom: '12px' }}>
                                            Confidence Trajectory
                                        </div>
                                        <ConfidenceFlow thoughtId={verdict.id} />
                                    </div>

                                    {/* Memory Context (Active System) */}
                                    {verdict.memory_matches && verdict.memory_matches.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#a1a6b3', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>Institutional Memory</span>
                                                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(214, 161, 75, 0.1)', color: '#d6a14b' }}>
                                                    {verdict.memory_matches.length} Matches
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                                                {verdict.memory_matches.map((match: any, i: number) => (
                                                    <div key={i} style={{ padding: '12px', background: '#151821', border: '1px solid #222632', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '13px', color: '#e6e8eb', marginBottom: '4px' }}>
                                                            {match.type === 'decision' ? match.text : match.description}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                                                            <span>{match.verdict || 'Pattern'}</span>
                                                            <span>{Math.round(match.confidence * 100)}% Match</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Counterfactual Controls (Future) */}
                    {verdict && (
                        <div style={{
                            padding: '20px',
                            background: '#151821',
                            border: '1px solid #222632',
                            borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e6e8eb', marginBottom: '16px' }}>
                                What would change it?
                            </h3>
                            <p style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '12px' }}>
                                Adjust these levers to simulate different scenarios
                            </p>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                [Counterfactual controls coming soon]
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Evidence Panel */}
            <EvidencePanel
                toolEvidence={toolEvidence}
                sources={verdict?.sources || []}
                memoryMatches={verdict?.memory_matches || []}
                verdict={verdict}
            />

            {/* Save Decision Dialog */}
            {showSaveDialog && verdict && (
                <SaveDecisionDialog
                    verdict={verdict}
                    topic={topic}
                    onClose={() => setShowSaveDialog(false)}
                    onSave={() => {
                        setShowSaveDialog(false);
                        // Reset form after save
                        setTopic('');
                        setCurrentStatus('');
                        setAdditionalNotes('');
                        setVerdict(null);
                    }}
                />
            )}
        </div>
    );
}
