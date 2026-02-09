'use client';

import { useState, useEffect } from 'react';
import { getFocusStats } from '@/lib/actions/focus';

interface FocusStats {
    habits: {
        currentStreak: number;
        longestStreak: number;
        totalSessions: number;
        totalFocusMinutes: number;
    };
    recentSessions: any[];
}

export function FocusAnalytics() {
    const [stats, setStats] = useState<FocusStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getFocusStats();
                setStats(data as any);
            } catch (error) {
                console.error("Failed to fetch focus stats", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return <div style={{ color: '#a1a6b3', fontSize: '13px' }}>Loading focus stats...</div>;
    if (!stats) return null;

    return (
        <div style={{
            padding: '24px',
            background: '#151821',
            border: '1px solid #222632',
            borderRadius: '12px',
            color: '#e6e8eb'
        }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                Deep Work Analytics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {/* Total Focus Time */}
                <div style={{ padding: '16px', background: '#0f1115', borderRadius: '8px', border: '1px solid #222632' }}>
                    <div style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>Total Focus Time</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#d6a14b' }}>
                        {Math.round(stats.habits.totalFocusMinutes / 60)}h {stats.habits.totalFocusMinutes % 60}m
                    </div>
                </div>

                {/* Total Sessions */}
                <div style={{ padding: '16px', background: '#0f1115', borderRadius: '8px', border: '1px solid #222632' }}>
                    <div style={{ fontSize: '13px', color: '#a1a6b3', marginBottom: '8px' }}>Sessions Completed</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#e6e8eb' }}>
                        {stats.habits.totalSessions}
                    </div>
                </div>
            </div>

            {/* Recent Sessions List */}
            <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#a1a6b3' }}>
                    Recent Sessions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.recentSessions.length === 0 ? (
                        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>No sessions yet</div>
                    ) : (
                        stats.recentSessions.map((session) => (
                            <div key={session.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                background: '#0f1115',
                                borderRadius: '6px',
                                border: '1px solid #222632'
                            }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#e6e8eb' }}>
                                        {session.title || 'Focus Session'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {new Date(session.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: '#d6a14b', fontWeight: 600 }}>
                                    {session.actualDurationMinutes}m
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export function FocusStreak() {
    const [stats, setStats] = useState<FocusStats | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getFocusStats();
                setStats(data as any);
            } catch (error) {
                console.error("Failed to fetch focus stats", error);
            }
        }
        fetchStats();
    }, []);

    if (!stats) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(214, 161, 75, 0.1)',
            border: '1px solid rgba(214, 161, 75, 0.3)',
            borderRadius: '8px',
            color: '#d6a14b'
        }}>
            <span style={{ fontSize: '16px' }}>🔥</span>
            <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.5px' }}>
                    Daily Streak
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {stats.habits.currentStreak} Days
                </div>
            </div>
        </div>
    );
}

// Combined export needed? For now keeping them in same file for simplicity as per prompt,
// though the task list had them separate. I'll export both from here.
