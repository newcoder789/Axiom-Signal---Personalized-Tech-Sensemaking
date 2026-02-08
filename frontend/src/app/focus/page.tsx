"use client";

import { useState, useEffect } from "react";

type FocusSession = {
    id: string;
    topic: string;
    startedAt: string;
    duration: number; // in seconds
    notes: string[];
    originalVerdict: {
        type: "pursue" | "explore" | "watchlist" | "ignore";
        confidence: number;
        date: string;
    };
    assumptions: string[];
    openQuestions: string[];
};

const demoSession: FocusSession = {
    id: "1",
    topic: "Learning Rust for CLI tools",
    startedAt: "10 mins ago",
    duration: 600,
    notes: [
        "Started with the official Rust book, chapter 1-3",
        "Ownership concept is tricky but starting to make sense",
        "Need to practice with more examples",
    ],
    originalVerdict: {
        type: "explore",
        confidence: 65,
        date: "3 days ago",
    },
    assumptions: [
        "CLI tools don't need complex async patterns",
        "Rust compiler feedback will accelerate learning",
        "6 months is enough to be productive",
    ],
    openQuestions: [
        "Should I use Clap or Argh for CLI parsing?",
        "Is the borrow checker really as hard as people say?",
        "What about cross-compilation for different platforms?",
    ],
};

const pastSessions = [
    { date: "Yesterday", duration: "45 min", topic: "Rust ownership practice" },
    { date: "2 days ago", duration: "30 min", topic: "Setting up Rust environment" },
    { date: "3 days ago", duration: "20 min", topic: "Initial research" },
];

export default function FocusPage() {
    const [session, setSession] = useState<FocusSession>(demoSession);
    const [isActive, setIsActive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [newNote, setNewNote] = useState("");
    const [showDriftAlert, setShowDriftAlert] = useState(false);

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
        if (elapsed > 0 && elapsed % 300 === 0) { // Every 5 minutes
            setShowDriftAlert(true);
        }
    }, [elapsed]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        setSession({
            ...session,
            notes: [...session.notes, newNote],
        });
        setNewNote("");
    };

    const handleEndSession = () => {
        setIsActive(false);
        // Would save session to backend
    };

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-display mb-2 animate-fade-in">Focus</h1>
                <p className="text-caption animate-fade-in stagger-1">Execution mode — stay on track, detect drift</p>
            </header>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Focus Area */}
                <div className="col-span-2 space-y-6">
                    {/* Current Project Card */}
                    <div className="card card-elevated animate-fade-in stagger-2">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="text-label">Currently Focused On</span>
                                <h2 className="text-heading mt-1">{session.topic}</h2>
                            </div>
                            <div className={`verdict-badge verdict-${session.originalVerdict.type}`}>
                                {session.originalVerdict.type}
                            </div>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="text-6xl font-mono font-bold mb-4">
                                    {formatTime(elapsed)}
                                </div>
                                <div className="flex gap-3 justify-center">
                                    {!isActive ? (
                                        <button onClick={() => setIsActive(true)} className="btn btn-primary px-8">
                                            Start Session
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => setIsActive(false)} className="btn btn-secondary">
                                                Pause
                                            </button>
                                            <button onClick={handleEndSession} className="btn btn-ghost">
                                                End Session
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Original Decision Snapshot */}
                        <div className="mt-6 p-4 rounded-lg bg-[var(--color-axiom-bg)]">
                            <div className="text-label mb-2">Original Decision</div>
                            <div className="flex items-center gap-4">
                                <span className="capitalize font-medium">{session.originalVerdict.type}</span>
                                <span className="text-caption">{session.originalVerdict.confidence}% confident</span>
                                <span className="text-caption">• {session.originalVerdict.date}</span>
                            </div>
                        </div>
                    </div>

                    {/* Session Notes */}
                    <div className="card animate-fade-in stagger-3">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-label">Session Notes</span>
                            <span className="text-caption">{session.notes.length} notes</span>
                        </div>

                        <div className="space-y-2 mb-4">
                            {session.notes.map((note, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-axiom-bg)]">
                                    <span className="text-[var(--color-axiom-text-muted)]">•</span>
                                    <span>{note}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                                placeholder="Add a note..."
                                className="input flex-1"
                            />
                            <button onClick={handleAddNote} className="btn btn-secondary">
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Drift Alert */}
                    {showDriftAlert && (
                        <div className="card border-yellow-500/50 bg-yellow-500/5 animate-fade-in">
                            <div className="flex items-start gap-4">
                                <span className="text-yellow-400 text-2xl">⚠</span>
                                <div className="flex-1">
                                    <h3 className="font-medium text-yellow-200 mb-1">Drift Check</h3>
                                    <p className="text-caption mb-4">
                                        You've been researching for 5 minutes. Your original decision was to <strong>explore</strong> Rust, not deep dive yet.
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowDriftAlert(false)} className="btn btn-secondary text-sm">
                                            I'm on track
                                        </button>
                                        <button className="btn btn-ghost text-sm">
                                            Update my focus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="col-span-1 space-y-4 animate-fade-in stagger-4">
                    {/* Assumptions */}
                    <div className="card">
                        <h3 className="text-label mb-3">Assumptions</h3>
                        <div className="space-y-2">
                            {session.assumptions.map((assumption, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-blue-400 mt-0.5">→</span>
                                    <span className="text-caption">{assumption}</span>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-ghost w-full mt-3 text-sm">
                            + Add Assumption
                        </button>
                    </div>

                    {/* Open Questions */}
                    <div className="card">
                        <h3 className="text-label mb-3">Open Questions</h3>
                        <div className="space-y-2">
                            {session.openQuestions.map((question, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-purple-400 mt-0.5">?</span>
                                    <span className="text-caption">{question}</span>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-ghost w-full mt-3 text-sm">
                            + Add Question
                        </button>
                    </div>

                    {/* Past Sessions */}
                    <div className="card">
                        <h3 className="text-label mb-3">Past Sessions</h3>
                        <div className="space-y-2">
                            {pastSessions.map((session, i) => (
                                <div key={i} className="p-3 rounded-lg bg-[var(--color-axiom-bg)]">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-caption">{session.date}</span>
                                        <span className="text-[var(--color-axiom-text-muted)]">{session.duration}</span>
                                    </div>
                                    <div className="text-sm mt-1">{session.topic}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Daily Log */}
                    <div className="card border-green-500/30">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-green-400">📊</span>
                            <span className="text-label">Today's Progress</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-caption">Total focus time</span>
                                <span className="font-medium">{formatTime(elapsed + 600)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-caption">Sessions</span>
                                <span className="font-medium">2</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-caption">Notes added</span>
                                <span className="font-medium">{session.notes.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
