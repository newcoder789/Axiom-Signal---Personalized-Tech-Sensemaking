"use client";

import { useState, useEffect } from "react";
import { startFocusSession, completeFocusSession } from "@/lib/actions/focus";
import { useRouter } from "next/navigation";

export type FocusSession = {
    id: string; // Decision ID or Session ID
    topic: string; // Decision Title
    startedAt?: string;
    duration: number; // in seconds, loaded from stored session or 0
    notes: string[]; // notes taken during session
    originalVerdict: {
        type: "pursue" | "explore" | "watchlist" | "ignore";
        confidence: number;
        date: string;
    };
    assumptions: string[]; // from thought.context or empty
    openQuestions: string[]; // from thought.context or empty
};

interface FocusClientProps {
    initialSession?: FocusSession;
    availableThoughts?: any[];
}

const defaultSession: FocusSession = {
    id: "demo",
    topic: "Select a decision to focus on",
    startedAt: "Not started",
    duration: 0,
    notes: [],
    originalVerdict: {
        type: "explore",
        confidence: 0,
        date: "Today",
    },
    assumptions: [],
    openQuestions: [],
};

export default function FocusClient({ initialSession, availableThoughts = [] }: FocusClientProps) {
    const router = useRouter();
    const [session, setSession] = useState<FocusSession | null>(initialSession || null);
    const [isActive, setIsActive] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [newNote, setNewNote] = useState("");
    const [showDriftAlert, setShowDriftAlert] = useState(false);
    const [driftReason, setDriftReason] = useState("");
    const [dbSessionId, setDbSessionId] = useState<string | null>(null);

    const [newAssumption, setNewAssumption] = useState("");
    const [newQuestion, setNewQuestion] = useState("");
    const [isAddingAssumption, setIsAddingAssumption] = useState(false);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(() => {
                setElapsed((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Simulate drift detection
    useEffect(() => {
        if (isActive && elapsed > 0 && elapsed % 300 === 0) { // Every 5 minutes
            const reasons = [
                "You've been researching for 5 minutes. Your original decision was to explore, which excludes deep-diving into implementation yet.",
                "Cognitive load check: You are currently 3 levels deep in nested dependencies. Surface and verify original assumptions?",
                "Context Leak: The current paper you're reading discusses scalability, but your focus is on DX and API design."
            ];
            setDriftReason(reasons[Math.floor(Math.random() * reasons.length)]);
            setShowDriftAlert(true);
        }
    }, [elapsed, isActive]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleAddNote = () => {
        if (!newNote.trim() || !session) return;
        setSession({
            ...session,
            notes: [...session.notes, newNote],
        });
        setNewNote("");
    };

    const handleAddAssumption = () => {
        if (!newAssumption.trim() || !session) return;
        setSession({
            ...session,
            assumptions: [...session.assumptions, newAssumption],
        });
        setNewAssumption("");
        setIsAddingAssumption(false);
    };

    const handleAddQuestion = () => {
        if (!newQuestion.trim() || !session) return;
        setSession({
            ...session,
            openQuestions: [...session.openQuestions, newQuestion],
        });
        setNewQuestion("");
        setIsAddingQuestion(false);
    };

    const handleStartSession = async () => {
        if (!session) return;
        setIsActive(true);

        try {
            const dbSession = await startFocusSession({
                thoughtId: session.id,
                title: session.topic,
                actionItems: [], // could populate from session
                durationMinutes: 25,
            });
            setDbSessionId(dbSession.id);
        } catch (error) {
            console.error("Failed to start session in DB:", error);
        }
    };

    const handleEndSession = async () => {
        setIsActive(false);
        if (dbSessionId) {
            try {
                await completeFocusSession(dbSessionId, {
                    outcome: 'completed',
                    notes: session?.notes.join("\n"),
                    actualDurationMinutes: Math.floor(elapsed / 60),
                    productivityScore: 0.8, // default or calculated
                });
                alert("Session ended! Notes saved to journal.");
                // Instead of navigating, allow new session
                // router.push("/journal-new"); 
            } catch (error) {
                console.error("Failed to complete session in DB:", error);
            }
        } else {
            // Local only
        }
    };

    const handleResetSession = () => {
        if (confirm("Are you sure? Current progress will be lost if not saved.")) {
            setSession(null);
            setElapsed(0);
            setIsActive(false);
            setNewNote("");
        }
    };

    const handleSelectThought = (thought: any) => {
        setSession({
            id: thought.id,
            topic: thought.title,
            duration: 0,
            notes: [],
            originalVerdict: {
                type: thought.verdict || 'explore',
                confidence: thought.confidence ? parseFloat(thought.confidence) : 0,
                date: new Date(thought.createdAt).toLocaleDateString(),
            },
            assumptions: (thought.context as any)?.assumptions || [],
            openQuestions: (thought.context as any)?.openQuestions || [],
        });
    };

    if (!session) {
        return (
            <div className="min-h-screen p-8 max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="h1 mb-2">Focus Mode</h1>
                    <p className="body">Select a past decision to start a deep-focus session</p>
                </header>

                <div className="grid gap-4">
                    {availableThoughts.length > 0 ? (
                        availableThoughts.map((thought) => (
                            <button
                                key={thought.id}
                                onClick={() => handleSelectThought(thought)}
                                className="card flex items-center justify-between p-6 text-left hover:border-accent-blue transition-all"
                            >
                                <div>
                                    <h3 className="h3 mb-1">{thought.title}</h3>
                                    <div className="flex gap-3 items-center">
                                        <span className={`verdict-badge verdict-${thought.verdict || 'explore'}`}>
                                            {thought.verdict || 'explore'}
                                        </span>
                                        <span className="caption">• {new Date(thought.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <span className="text-2xl text-gray-500">→</span>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
                            <p className="text-gray-500 mb-6">No recent decisions found.</p>
                            <a href="/decide" className="btn btn-primary">Start an Analysis</a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            {!isZenMode && (
                <header className="mb-8 flex justify-between items-center animate-fade-in">
                    <div>
                        <h1 className="h1 mb-2">Focus</h1>
                        <p className="body" style={{ color: "var(--text-tertiary)" }}>Execution mode — stay on track, detect drift</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleResetSession}
                            className="btn btn-ghost glass"
                            style={{ display: isActive ? 'none' : 'flex' }}
                        >
                            ← Select Different Topic
                        </button>
                        <button
                            onClick={() => setIsZenMode(true)}
                            className="btn btn-secondary glass"
                            style={{ display: isActive ? 'flex' : 'none', gap: '8px' }}
                        >
                            ✨ Enter Zen Mode
                        </button>
                    </div>
                </header>
            )}

            {isZenMode && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100 }}>
                    <button
                        onClick={() => setIsZenMode(false)}
                        className="btn btn-ghost glass"
                        style={{ border: '1px solid var(--border-primary)', borderRadius: '20px', padding: '8px 16px' }}
                    >
                        ✕ Exit Zen Mode
                    </button>
                </div>
            )}

            <div style={{
                display: "grid",
                gridTemplateColumns: isZenMode ? "1fr" : "2fr 1fr",
                gap: "24px",
                maxWidth: isZenMode ? "800px" : "100%",
                margin: isZenMode ? "40px auto" : "0",
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                {/* Main Focus Area */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Current Project Card */}
                    <div className={`card ${isZenMode ? 'glass' : 'card-premium'} animate-fade-in stagger-2`} style={{
                        padding: isZenMode ? "64px" : "32px",
                        textAlign: isZenMode ? "center" : "left",
                        border: isZenMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border-primary)",
                        boxShadow: isZenMode ? "0 20px 50px rgba(0,0,0,0.5)" : "var(--shadow-lg)"
                    }}>
                        <div style={{
                            display: "flex",
                            flexDirection: isZenMode ? "column" : "row",
                            justifyContent: "space-between",
                            alignItems: isZenMode ? "center" : "start",
                            marginBottom: "24px",
                            gap: "16px"
                        }}>
                            <div>
                                <span className="label" style={{ opacity: 0.6 }}>Currently Focused On</span>
                                <h2 className="h2 mt-1" style={{ fontSize: isZenMode ? "32px" : "20px" }}>{session.topic}</h2>
                            </div>
                            <div className={`verdict-badge verdict-${session.originalVerdict.type}`} style={{ padding: "4px 12px" }}>
                                {session.originalVerdict.type.toUpperCase()}
                            </div>
                        </div>

                        {/* Timer */}
                        <div style={{
                            padding: isZenMode ? "64px 0" : "32px 0",
                            textAlign: "center",
                            position: "relative"
                        }}>
                            {isZenMode && isActive && (
                                <div className="focus-pulse" style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "300px",
                                    height: "300px",
                                    background: "radial-gradient(circle, var(--accent-blue-muted) 0%, transparent 70%)",
                                    zIndex: -1,
                                    opacity: 0.5
                                }} />
                            )}
                            <div style={{
                                fontSize: isZenMode ? "120px" : "64px",
                                fontFamily: "var(--font-mono)",
                                fontWeight: "bold",
                                marginBottom: "24px",
                                color: isZenMode ? "var(--text-primary)" : "var(--accent-blue)",
                                letterSpacing: "-0.02em"
                            }}>
                                {formatTime(elapsed)}
                            </div>
                            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                                {!isActive ? (
                                    <div className="flex gap-4">
                                        <button onClick={handleStartSession} className="btn btn-primary px-12 py-6 text-lg" style={{ background: "var(--accent-gold)", color: "#000", fontWeight: 700 }}>
                                            {elapsed > 0 ? "Resume Session" : "Start Session"}
                                        </button>
                                        {elapsed > 0 && <button onClick={handleEndSession} className="btn btn-ghost px-8" style={{ border: "1px solid var(--border-primary)" }}>
                                            Finish
                                        </button>}
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => setIsActive(false)} className="btn btn-secondary px-8">
                                            Pause
                                        </button>
                                        <button onClick={handleEndSession} className="btn btn-ghost px-8" style={{ border: "1px solid var(--border-primary)" }}>
                                            End Session
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {!isZenMode && (
                            <div style={{ marginTop: "24px", padding: "16px", background: "var(--bg-primary)", border: "1px solid var(--border-primary)", borderRadius: "12px" }}>
                                <div className="label mb-2" style={{ color: "var(--text-tertiary)" }}>Original Decision Snapshot</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-gold)" }}></div>
                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{session.originalVerdict.type}</span>
                                    </div>
                                    <span className="caption" style={{ fontSize: "12px" }}>Confidence: {session.originalVerdict.confidence}%</span>
                                    <span className="caption" style={{ fontSize: "12px" }}>Analyzed on {session.originalVerdict.date}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Session Notes */}
                    <div className="card animate-fade-in stagger-3" style={{ padding: "24px", display: isZenMode && !isActive ? 'none' : 'block' }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <span className="label">Session Insights</span>
                            <span className="caption">{session.notes.length} notes captured</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                            {session.notes.map((note, i) => (
                                <div key={i} className="glass" style={{ display: "flex", alignItems: "start", gap: "12px", padding: "14px", borderRadius: "8px" }}>
                                    <span style={{ color: "var(--accent-gold)", marginTop: "2px" }}>⚡</span>
                                    <span style={{ fontSize: "14px" }}>{note}</span>
                                </div>
                            ))}
                            {session.notes.length === 0 && (
                                <div className="caption italic text-center p-4">No insights captured yet.</div>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                                placeholder="Capture an insight..."
                                className="input glass"
                                style={{ flex: 1, padding: "12px 16px" }}
                            />
                            <button onClick={handleAddNote} className="btn btn-secondary glass">
                                Capture
                            </button>
                        </div>
                    </div>

                    {/* Drift Alert */}
                    {showDriftAlert && (
                        <div className="card glass animate-fade-in" style={{ padding: "24px", borderLeft: "4px solid var(--accent-yellow)", background: "rgba(245, 158, 11, 0.05)" }}>
                            <div style={{ display: "flex", alignItems: "start", gap: "20px" }}>
                                <span style={{ fontSize: "32px", marginTop: "-4px" }}>⚠️</span>
                                <div style={{ flex: 1 }}>
                                    <h3 className="h3 mb-2" style={{ color: "var(--accent-yellow)" }}>Drift Detected</h3>
                                    <p className="body mb-5" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
                                        {driftReason}
                                    </p>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <button onClick={() => setShowDriftAlert(false)} className="btn btn-secondary btn-sm px-6">
                                            I'm on track
                                        </button>
                                        <button className="btn btn-ghost btn-sm px-6" style={{ border: "1px solid var(--border-primary)" }}>
                                            Re-align focus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                {!isZenMode && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fade-in stagger-4">
                        {/* Assumptions */}
                        <div className="card" style={{ padding: "20px" }}>
                            <h3 className="label mb-4" style={{ color: "var(--accent-blue)" }}>Assumptions</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {session.assumptions.map((assumption, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-blue)", marginTop: "6px" }}></div>
                                        <span className="caption" style={{ fontSize: "13px", color: "var(--text-primary)" }}>{assumption}</span>
                                    </div>
                                ))}
                                {session.assumptions.length === 0 && !isAddingAssumption && <span className="caption italic">No assumptions recorded.</span>}

                                {isAddingAssumption && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            autoFocus
                                            className="input text-xs p-2 w-full"
                                            value={newAssumption}
                                            onChange={(e) => setNewAssumption(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddAssumption()}
                                            placeholder="New assumption..."
                                        />
                                        <button onClick={handleAddAssumption} className="btn btn-primary btn-xs">Add</button>
                                    </div>
                                )}
                            </div>
                            {!isAddingAssumption && (
                                <button
                                    onClick={() => setIsAddingAssumption(true)}
                                    className="btn btn-ghost btn-sm mt-4 glass"
                                    style={{ width: "100%", fontSize: "11px" }}>
                                    + Add Assumption
                                </button>
                            )}
                        </div>

                        {/* Open Questions */}
                        <div className="card" style={{ padding: "20px" }}>
                            <h3 className="label mb-4" style={{ color: "var(--accent-yellow)" }}>Open Questions</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {session.openQuestions.map((question, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                                        <span style={{ color: "var(--accent-yellow)", fontSize: "16px", fontWeight: "bold", marginTop: "-2px" }}>?</span>
                                        <span className="caption" style={{ fontSize: "13px", color: "var(--text-primary)" }}>{question}</span>
                                    </div>
                                ))}
                                {session.openQuestions.length === 0 && !isAddingQuestion && <span className="caption italic">No open questions.</span>}

                                {isAddingQuestion && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            autoFocus
                                            className="input text-xs p-2 w-full"
                                            value={newQuestion}
                                            onChange={(e) => setNewQuestion(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                                            placeholder="What do you need to answer?"
                                        />
                                        <button onClick={handleAddQuestion} className="btn btn-primary btn-xs">Add</button>
                                    </div>
                                )}
                            </div>
                            {!isAddingQuestion && (
                                <button
                                    onClick={() => setIsAddingQuestion(true)}
                                    className="btn btn-ghost btn-sm mt-4 glass"
                                    style={{ width: "100%", fontSize: "11px" }}>
                                    + Add Question
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
