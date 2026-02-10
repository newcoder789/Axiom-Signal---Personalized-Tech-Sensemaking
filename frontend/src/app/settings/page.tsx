"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionWrapper } from '../components/ui/MotionWrapper';

interface Preferences {
    notification_settings: {
        frequency: 'high' | 'medium' | 'low';
        enabled_types: string[];
    };
    focus_mode_settings: {
        timer_duration: number;
        auto_start: boolean;
    };
}

export default function SettingsPage() {
    const [prefs, setPrefs] = useState<Preferences | null>(null);
    const [evolution, setEvolution] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [pruneStatus, setPruneStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prefRes, debugRes] = await Promise.all([
                fetch('http://localhost:8000/api/user/preferences'),
                fetch('http://localhost:8000/api/debug/state')
            ]);

            if (prefRes.ok) setPrefs(await prefRes.json());
            if (debugRes.ok) {
                const debugData = await debugRes.json();
                setEvolution(debugData.evolution);
            }
        } catch (e) {
            console.error("Failed to fetch data", e);
        }
    };

    const handleSave = async () => {
        if (!prefs) return;
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('http://localhost:8000/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs)
            });
            if (res.ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOverrideStrategy = async (strategy: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/agent/strategy/override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy })
            });
            if (res.ok) {
                const data = await res.json();
                setEvolution(prev => ({ ...prev, strategy: data.strategy }));
                fetchData(); // Refresh full state
            }
        } catch (e) {
            console.error("Strategy override failed", e);
        }
    };

    const handlePruneMemories = async () => {
        setPruneStatus('loading');
        try {
            const res = await fetch('http://localhost:8000/api/user/memory/prune', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 30 })
            });
            if (res.ok) {
                setPruneStatus('success');
                setTimeout(() => setPruneStatus('idle'), 3000);
            }
        } catch (e) {
            setPruneStatus('idle');
        }
    };

    const toggleType = (type: string) => {
        if (!prefs) return;
        const current = prefs.notification_settings.enabled_types;
        const next = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];

        setPrefs({
            ...prefs,
            notification_settings: {
                ...prefs.notification_settings,
                enabled_types: next
            }
        });
    };

    if (!prefs) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="status-indicator status-indicator-pulse"></div>
                <span className="ml-2 text-primary opacity-60">Loading preferences...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-12 pb-32">
            <header>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="h1 mb-2">System Settings</h1>
                    <p className="text-tertiary">Calibrate your Axiom Signal experience and technical memory.</p>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Agent Control Panel */}
                <MotionWrapper delay={0.1}>
                    <section className="card card-premium glass-premium p-6 glow-accent h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl">🤖</span>
                            <h2 className="text-xl font-medium">Agent Posture</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Manual Strategy Override</label>
                                <div className="flex flex-col gap-2">
                                    {['concise', 'balanced', 'proactive'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleOverrideStrategy(s)}
                                            className={`flex justify-between items-center px-4 py-3 rounded-xl text-sm transition-all border ${evolution?.strategy === s
                                                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                                                : 'bg-white/5 border-white/5 text-tertiary hover:border-white/20'
                                                }`}
                                        >
                                            <span className="capitalize">{s}</span>
                                            {evolution?.strategy === s && <span className="text-xs">Active</span>}
                                        </button>
                                    ))}
                                </div>
                                <p className="caption mt-3 opacity-60">
                                    Override the evolutionary scoring logic to force a specific interaction style.
                                </p>
                            </div>
                        </div>
                    </section>
                </MotionWrapper>

                {/* 2. Notification Settings */}
                <MotionWrapper delay={0.2}>
                    <section className="card card-premium glass-premium p-6 h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl">🔔</span>
                            <h2 className="text-xl font-medium">Notifications</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Signal Frequency</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['low', 'medium', 'high'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setPrefs({
                                                ...prefs,
                                                notification_settings: { ...prefs.notification_settings, frequency: f as any }
                                            })}
                                            className={`px-3 py-2 rounded-lg text-sm transition-all border ${prefs.notification_settings.frequency === f
                                                ? 'bg-gold-500/10 border-gold-500/50 text-gold-400'
                                                : 'bg-white/5 border-white/5 text-tertiary hover:border-white/20'
                                                }`}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Insights Enabled</label>
                                {[
                                    { id: 'repetition', label: 'Repetitions' },
                                    { id: 'contradiction', label: 'Contradictions' },
                                    { id: 'followup_needed', label: 'Follow-ups' }
                                ].map(type => (
                                    <label key={type.id} className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                                            {type.label} Sensors
                                        </span>
                                        <div
                                            onClick={() => toggleType(type.id)}
                                            className={`w-9 h-5 rounded-full transition-all relative ${prefs.notification_settings.enabled_types.includes(type.id)
                                                ? 'bg-blue-500'
                                                : 'bg-white/10'
                                                }`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all ${prefs.notification_settings.enabled_types.includes(type.id) ? 'translate-x-4' : ''
                                                }`} />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>
                </MotionWrapper>

                {/* 3. Memory & Performance */}
                <MotionWrapper delay={0.3}>
                    <section className="card card-premium glass-premium p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl">🧠</span>
                            <h2 className="text-xl font-medium">Memory Engine</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">History Depth</label>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                                    <span className="text-sm text-secondary">Active Context Tokens</span>
                                    <span className="text-sm font-mono text-gold-400">~2,400</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handlePruneMemories}
                                    disabled={pruneStatus === 'loading'}
                                    className={`w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-all ${pruneStatus === 'loading' ? 'opacity-50 cursor-wait' : ''
                                        }`}
                                >
                                    {pruneStatus === 'loading' ? 'Pruning...' :
                                        pruneStatus === 'success' ? '✓ Pruned' : 'Prune Memories > 30 Days'}
                                </button>
                                <p className="caption mt-2 opacity-60 text-center">
                                    Clearing old memories frees up cognitive bandwidth and improves agent relevance.
                                </p>
                            </div>
                        </div>
                    </section>
                </MotionWrapper>

                {/* 4. Focus Mode */}
                <MotionWrapper delay={0.4}>
                    <section className="card card-premium glass-premium p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-xl">⚡</span>
                            <h2 className="text-xl font-medium">Focus Experience</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="block text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Default Timer (min)</label>
                                <input
                                    type="number"
                                    value={prefs.focus_mode_settings.timer_duration}
                                    onChange={(e) => setPrefs({
                                        ...prefs,
                                        focus_mode_settings: { ...prefs.focus_mode_settings, timer_duration: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>

                            <label className="flex items-center justify-between cursor-pointer group pt-2">
                                <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                                    Auto-start focus timer
                                </span>
                                <div
                                    onClick={() => setPrefs({
                                        ...prefs,
                                        focus_mode_settings: { ...prefs.focus_mode_settings, auto_start: !prefs.focus_mode_settings.auto_start }
                                    })}
                                    className={`w-9 h-5 rounded-full transition-all relative ${prefs.focus_mode_settings.auto_start
                                        ? 'bg-blue-500'
                                        : 'bg-white/10'
                                        }`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all ${prefs.focus_mode_settings.auto_start ? 'translate-x-4' : ''
                                        }`} />
                                </div>
                            </label>
                        </div>
                    </section>
                </MotionWrapper>
            </div>

            {/* Floating Action Button for Save */}
            <motion.div
                className="fixed bottom-8 right-8 z-50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold shadow-2xl transition-all ${isSaving
                        ? 'bg-white/10 text-tertiary cursor-wait'
                        : 'bg-gold-500 text-black hover:bg-gold-400'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <div className="status-indicator status-indicator-pulse !bg-black"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <span>💾</span>
                            Save All Changes
                        </>
                    )}
                </button>
            </motion.div>

            {/* Status Toast */}
            <AnimatePresence>
                {saveStatus !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-28 right-8 px-6 py-3 rounded-xl text-sm font-medium z-50 ${saveStatus === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                    >
                        {saveStatus === 'success' ? '✓ Preferences updated successfully' : '❌ Failed to save preferences'}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
