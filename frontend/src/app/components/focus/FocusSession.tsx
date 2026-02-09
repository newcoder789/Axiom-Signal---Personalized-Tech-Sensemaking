'use client';

import { useState, useEffect, useRef } from 'react';
import { startFocusSession, completeFocusSession, updateSessionProgress } from '@/lib/actions/focus';
import { successToast, errorToast } from '@/lib/toast';

interface ActionItem {
    id: string;
    text: string;
    completed: boolean;
}

interface FocusSessionProps {
    thoughtId: string;
    initialActionItems: ActionItem[];
    onSessionComplete?: () => void;
}

export function FocusSession({ thoughtId, initialActionItems, onSessionComplete }: FocusSessionProps) {
    // Session State
    const [isActive, setIsActive] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [targetMinutes, setTargetMinutes] = useState(25);

    // Action Items State
    const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems);

    // Outcome State
    const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
    const [outcome, setOutcome] = useState<'completed' | 'drifted' | 'abandoned' | 'successful'>('completed');
    const [outcomeNotes, setOutcomeNotes] = useState('');
    const [focusScore, setFocusScore] = useState(5); // 1-5 scale

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync initial items if they change (and session not active)
    useEffect(() => {
        if (!isActive && !sessionId) {
            setActionItems(initialActionItems);
        }
    }, [initialActionItems, isActive, sessionId]);

    // Timer Logic
    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive]);

    // Format Time 00:00
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartSession = async () => {
        setIsActive(true);
        try {
            const session = await startFocusSession({
                thoughtId,
                title: 'Focus Session', // Could prompt for specific title
                actionItems,
                durationMinutes: targetMinutes
            });
            setSessionId(session.id);
            successToast('Focus session started');
        } catch (error) {
            console.error('Failed to start session', error);
            errorToast('Could not start session');
            setIsActive(false);
        }
    };

    const handleToggleItem = async (id: string) => {
        const updatedItems = actionItems.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        setActionItems(updatedItems);

        // If session is active, sync progress
        if (sessionId) {
            const completedCount = updatedItems.filter(i => i.completed).length;
            await updateSessionProgress(sessionId, {
                completedActionCount: completedCount,
                totalActionCount: updatedItems.length,
                actionItems: updatedItems
            });
        }
    };

    const handleEndSession = () => {
        setIsActive(false);
        setShowOutcomeDialog(true);
    };

    const handleSubmitOutcome = async () => {
        if (!sessionId) return;

        try {
            await completeFocusSession(sessionId, {
                outcome,
                notes: outcomeNotes,
                actualDurationMinutes: Math.round(elapsedSeconds / 60),
                focusScore: focusScore / 5, // Normalize to 0-1
                productivityScore: actionItems.filter(i => i.completed).length / Math.max(actionItems.length, 1) // Simple calc
            });
            successToast('Session saved');
            setShowOutcomeDialog(false);
            setSessionId(null);
            setElapsedSeconds(0);
            if (onSessionComplete) onSessionComplete();
        } catch (error) {
            console.error('Failed to save session', error);
            errorToast('Failed to save session outcome');
        }
    };

    if (showOutcomeDialog) {
        return (
            <div style={{
                padding: '24px',
                background: '#151821',
                border: '1px solid #222632',
                borderRadius: '12px',
                color: '#e6e8eb'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Session Complete</h3>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>
                        How did it go?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {(['completed', 'successful', 'drifted', 'abandoned'] as const).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setOutcome(opt)}
                                style={{
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: `1px solid ${outcome === opt ? '#d6a14b' : '#222632'}`,
                                    background: outcome === opt ? 'rgba(214, 161, 75, 0.1)' : '#0f1115',
                                    color: outcome === opt ? '#d6a14b' : '#a1a6b3',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>
                        Focus Score (1-5)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map(score => (
                            <button
                                key={score}
                                onClick={() => setFocusScore(score)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: `1px solid ${focusScore === score ? '#d6a14b' : '#222632'}`,
                                    background: focusScore === score ? '#d6a14b' : '#0f1115',
                                    color: focusScore === score ? '#000' : '#a1a6b3',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                {score}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>
                        Notes (Optional)
                    </label>
                    <textarea
                        value={outcomeNotes}
                        onChange={(e) => setOutcomeNotes(e.target.value)}
                        placeholder="What got done? Any blockers?"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#0f1115',
                            border: '1px solid #222632',
                            borderRadius: '8px',
                            color: '#e6e8eb',
                            minHeight: '80px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleSubmitOutcome}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: '#d6a14b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Save Session
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '24px',
            background: isActive ? 'rgba(214, 161, 75, 0.05)' : '#151821',
            border: `1px solid ${isActive ? 'rgba(214, 161, 75, 0.3)' : '#222632'}`,
            borderRadius: '12px',
            color: '#e6e8eb',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Deep Work Session</h3>
                <div style={{ fontSize: '32px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isActive ? '#d6a14b' : '#a1a6b3' }}>
                    {formatTime(elapsedSeconds)}
                </div>
            </div>

            {/* Action Items Checklist */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>SESSION GOALS</span>
                    <span>{actionItems.filter(i => i.completed).length}/{actionItems.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {actionItems.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', padding: '12px', background: '#0f1115', borderRadius: '8px' }}>
                            No action items defined in verdict.
                        </div>
                    ) : (
                        actionItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleToggleItem(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '12px',
                                    background: item.completed ? 'rgba(74, 222, 128, 0.1)' : '#0f1115',
                                    borderRadius: '8px',
                                    border: '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    opacity: item.completed ? 0.7 : 1
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: `2px solid ${item.completed ? '#4ade80' : '#4b5563'}`,
                                    background: item.completed ? '#4ade80' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '2px',
                                    flexShrink: 0
                                }}>
                                    {item.completed && <span style={{ color: '#000', fontSize: '12px', fontWeight: 800 }}>✓</span>}
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    textDecoration: item.completed ? 'line-through' : 'none',
                                    color: item.completed ? '#a1a6b3' : '#e6e8eb'
                                }}>
                                    {item.text}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Controls */}
            {!isActive ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <select
                            value={targetMinutes}
                            onChange={(e) => setTargetMinutes(Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#0f1115',
                                border: '1px solid #222632',
                                borderRadius: '8px',
                                color: '#e6e8eb'
                            }}
                        >
                            <option value={15}>15 Minutes</option>
                            <option value={25}>25 Minutes (Pomodoro)</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>60 Minutes</option>
                        </select>
                    </div>
                    <button
                        onClick={handleStartSession}
                        style={{
                            flex: 2,
                            padding: '12px',
                            background: '#d6a14b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>▶</span> Start Focus
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleEndSession}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    ⏹ End Session
                </button>
            )}
        </div>
    );
}
