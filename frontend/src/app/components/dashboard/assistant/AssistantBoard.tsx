"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../../notifications/NotificationContext';
import { TaskButton } from './TaskButton';
import taskService from '@/lib/tasks/TaskService';
import { API_BASE_URL } from '@/lib/config';

export const AssistantBoard: React.FC = () => {
    const [lastResult, setLastResult] = useState<any>(null);
    const [evolution, setEvolution] = useState<any>(null);
    const [evolutionLoading, setEvolutionLoading] = useState(false);
    const { agentLogs } = useNotifications();

    React.useEffect(() => {
        const fetchEvolution = async () => {
            setEvolutionLoading(true);
            try {
                const resp = await fetch(`${API_BASE_URL}/api/debug/state`);
                if (resp.ok) {
                    const data = await resp.json();
                    setEvolution(data.evolution);
                }
            } catch (err) {
                console.error("Failed to fetch evolution:", err);
            } finally {
                setEvolutionLoading(false);
            }
        };
        fetchEvolution();
    }, [lastResult]);
    const [activeTab, setActiveTab] = useState<'board' | 'signals'>('board');
    const tasks = taskService.getAvailableTasks();
    const categories = taskService.getTaskCategories();

    const handleSuccess = (result: any) => {
        setLastResult(result);
    };

    const handleError = (err: any) => {
        console.error("Task error:", err);
        setLastResult({ error: err.message });
    };

    const renderResult = () => {
        if (!lastResult) return null;

        return (
            <div className="card glass mt-4 p-4 animate-fade-in" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid var(--accent-gold-muted)" }}>
                <div className="label mb-3" style={{ color: "var(--accent-gold)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px" }}>RESULT: {lastResult.taskId?.toUpperCase()}</span>
                    <button onClick={() => setLastResult(null)} className="btn-ghost" style={{ padding: "2px 6px", fontSize: "10px" }}>dismiss</button>
                </div>
                {lastResult.error ? (
                    <div style={{ background: "rgba(255,50,50,0.05)", border: "1px solid rgba(255,50,50,0.1)", padding: "12px", color: "var(--accent-red)", fontSize: "12px", borderRadius: "8px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <span>⚠️</span>
                            <span>{lastResult.error}</span>
                        </div>
                    </div>
                ) : (
                    <div className="body-secondary" style={{ fontSize: "13px", lineHeight: "1.6" }}>
                        {lastResult.summary && <p style={{ whiteSpace: "pre-wrap" }}>{lastResult.summary}</p>}
                        {lastResult.advice && <p style={{ fontStyle: "italic", borderLeft: "2px solid var(--accent-gold)", paddingLeft: "12px" }}>"{lastResult.advice}"</p>}
                        {lastResult.actions && lastResult.actions.length > 0 && (
                            <div className="mb-4">
                                <div className="label mb-2" style={{ fontSize: "10px", opacity: 0.6 }}>Immediate Actions</div>
                                <ul style={{ paddingLeft: "18px" }}>
                                    {lastResult.actions.map((a: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{a}</li>)}
                                </ul>
                            </div>
                        )}
                        {lastResult.tasks && lastResult.tasks.length > 0 && (
                            <div className="mb-4">
                                <div className="label mb-2" style={{ fontSize: "10px", opacity: 0.6 }}>Project Tasks</div>
                                <ul style={{ paddingLeft: "18px" }}>
                                    {lastResult.tasks.map((t: string, i: number) => <li key={i} style={{ marginBottom: "6px" }}>{t}</li>)}
                                </ul>
                            </div>
                        )}
                        {lastResult.actions && lastResult.actions.length === 0 && lastResult.taskId === 'extract-actions' && <p className="caption italic">No specific actions identified.</p>}
                        {lastResult.tasks && lastResult.tasks.length === 0 && lastResult.taskId === 'extract-tasks' && <p className="caption italic">No specific tasks identified.</p>}
                        {lastResult.review && (
                            <div>
                                <p style={{ marginBottom: "12px" }}>{lastResult.review.text}</p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px" }}>
                                    <div>
                                        <div className="label" style={{ fontSize: "9px" }}>Entries</div>
                                        <div className="body" style={{ fontWeight: "600" }}>{lastResult.review.stats.entries}</div>
                                    </div>
                                    <div>
                                        <div className="label" style={{ fontSize: "9px" }}>Words</div>
                                        <div className="body" style={{ fontWeight: "600" }}>{lastResult.review.stats.totalWords}</div>
                                    </div>
                                </div>
                                {lastResult.review.stats.topTopics.length > 0 && (
                                    <div className="mt-3">
                                        <div className="label" style={{ fontSize: "9px", marginBottom: "4px" }}>Top Topics</div>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            {lastResult.review.stats.topTopics.map((t: string) => (
                                                <span key={t} className="badge badge-explore" style={{ fontSize: "10px" }}>#{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {lastResult.contradictions && lastResult.contradictions.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {lastResult.contradictions.map((c: any, i: number) => (
                                    <div key={i} style={{ padding: "10px", background: "rgba(255, 50, 50, 0.05)", borderRadius: "6px", borderLeft: "2px solid var(--accent-red)" }}>
                                        <div className="body" style={{ fontWeight: "600", fontSize: "12px", marginBottom: "4px" }}>{c.details.message}</div>
                                        <p className="caption" style={{ fontSize: "11px" }}>{c.details.suggestion}</p>
                                    </div>
                                ))}
                            </div>
                        ) : lastResult.taskId === 'find-contradictions' ? <p className="caption italic">No contradictions found in recent history.</p> : null}

                        {lastResult.decisions && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {lastResult.decisions.map((d: any, i: number) => (
                                    <div key={i} style={{ padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span className="caption">Item ID: {d.id}</span>
                                            <span className={`verdict-badge verdict-${d.verdict?.toLowerCase()}`}>{d.verdict}</span>
                                        </div>
                                        <p style={{ fontSize: "12px" }}>{d.reasoning}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "flex-end" }}>
                    <span className="caption" style={{ fontSize: "10px" }}>{new Date(lastResult.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in" style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            height: "100%",
            padding: "8px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="relative group">
                    <div style={{
                        width: "32px",
                        height: "32px",
                        background: "var(--accent-gold-muted)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-gold)",
                        fontSize: "18px"
                    }}>🤖</div>
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]"
                        />
                    </div>
                </div>
                <div>
                    <h3 className="h3" style={{ fontSize: "15px" }}>Assistant Board</h3>
                    <p className="caption" style={{ fontSize: "11px" }}>On-demand agent tasks</p>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", paddingRight: "4px" }}>
                {categories.map(cat => (
                    <div key={cat}>
                        <div className="label mb-3" style={{
                            fontSize: "10px",
                            letterSpacing: "1.5px",
                            color: "var(--text-tertiary)",
                            borderBottom: "1px solid var(--border-primary)",
                            paddingBottom: "4px"
                        }}>{cat.toUpperCase()}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {tasks.filter(t => t.category === cat).map(task => (
                                <TaskButton
                                    key={task.id}
                                    task={task}
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {renderResult()}

            <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card glass-premium" style={{ padding: "12px" }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div className="label" style={{ fontSize: "9px" }}>Agent Posture</div>
                        {evolution && (
                            <div className="badge" style={{
                                fontSize: "9px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                Sync: {Math.round(evolution.score * 100)}%
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="status-indicator status-indicator-pulse"></div>
                        <span className="caption" style={{ color: "var(--accent-green)", fontWeight: "600", textTransform: "capitalize" }}>
                            {evolution?.strategy || "Standby"}
                        </span>
                    </div>
                    {evolution?.config && (
                        <p className="caption mt-2" style={{ fontSize: "10px", lineHeight: "1.4", opacity: 0.8 }}>
                            {evolution.strategy === 'proactive'
                                ? "Providing deep insights and correlated follow-ups."
                                : evolution.strategy === 'concise'
                                    ? "Staying brief to preserve your bandwidth."
                                    : "Balanced technical sensemaking active."}
                        </p>
                    )}
                </motion.div>

                {/* Thinking Logs Panel */}
                <AnimatePresence>
                    {agentLogs.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] space-y-1"
                        >
                            <div className="flex justify-between items-center mb-2 opacity-40 uppercase tracking-widest">
                                <span>Agent Thinking Logs</span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                            {agentLogs.map((log: string, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`${i === 0 ? 'text-blue-400' : 'text-tertiary/60'}`}
                                >
                                    <span className="opacity-30 mr-2">&gt;</span>
                                    {log}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
