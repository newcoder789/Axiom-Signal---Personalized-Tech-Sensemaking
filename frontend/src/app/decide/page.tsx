'use client';

import { useState } from 'react';
import { VerdictCard } from '../components/decide/VerdictCard';
import { EvidencePanel } from '../components/decide/EvidencePanel';
import { SaveDecisionDialog } from '../components/decide/SaveDecisionDialog';

export default function DecidePageNew() {
    const [topic, setTopic] = useState('');
    const [currentStatus, setCurrentStatus] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [profile, setProfile] = useState('Backend dev');
    const [experience, setExperience] = useState('2 years');
    const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');

    const [verdict, setVerdict] = useState<any>(null);
    const [toolEvidence, setToolEvidence] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not-helpful' | null>(null);

    const handleAnalyze = async () => {
        if (!topic.trim()) return;

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/verdict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    current_status: currentStatus,
                    additional_notes: additionalNotes,
                    user_profile: profile,
                    experience_level: experience,
                    risk_tolerance: riskTolerance
                })
            });

            if (response.ok) {
                const data = await response.json();
                setVerdict(data);
                setToolEvidence(data.tool_evidence);
            }
        } catch (error) {
            console.error('Analysis failed:', error);
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
                    {['Backend dev', 'ML dev', 'Student', 'Founder'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setProfile(p)}
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
                                    {isAnalyzing ? 'Analyzing...' : '→ Analyze'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Verdict Card */}
                    {verdict && (
                        <VerdictCard
                            verdict={verdict}
                            onSave={handleSave}
                            onStartFocus={() => console.log('Start focus')}
                        />
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
