"use client";

import { useState } from "react";

// Types
type EventType = "decision" | "journal" | "revision" | "explore" | "alert";
type VerdictType = "pursue" | "explore" | "watchlist" | "ignore";

type HistoryEvent = {
    id: string;
    type: EventType;
    date: string;
    topic: string;
    verdict?: VerdictType;
    confidence?: number;
    reason?: string;
    linkedTo?: string;
    revision?: {
        original: VerdictType;
        updated: VerdictType;
        originalConfidence: number;
        updatedConfidence: number;
        changedEvidence: string;
    };
    journalSnippet?: string;
};

const historyEvents: HistoryEvent[] = [
    {
        id: "1",
        type: "revision",
        date: "Jan 20, 2026",
        topic: "Kubernetes for solo projects",
        revision: {
            original: "explore",
            updated: "ignore",
            originalConfidence: 55,
            updatedConfidence: 78,
            changedEvidence: "Hiring decline detected, tooling stagnation confirmed"
        }
    },
    {
        id: "2",
        type: "journal",
        date: "Jan 15, 2026",
        topic: "Redis vs Kafka trade-offs",
        journalSnippet: "I think I'm underestimating infra costs here. The simplicity of Redis might be deceptive for high-throughput scenarios.",
        linkedTo: "Redis vs Kafka decision"
    },
    {
        id: "3",
        type: "decision",
        date: "Jan 12, 2026",
        topic: "PostgreSQL 17 adoption",
        verdict: "watchlist",
        confidence: 62,
        reason: "Freshness risk detected, adoption signals unclear"
    },
    {
        id: "4",
        type: "explore",
        date: "Jan 8, 2026",
        topic: "Temporal workflow engine",
        confidence: 71,
        reason: "Discovered via Explore → connects to async task processing interest"
    },
    {
        id: "5",
        type: "decision",
        date: "Jan 5, 2026",
        topic: "FastAPI for backend",
        verdict: "pursue",
        confidence: 88,
        reason: "Strong market signal, low friction, excellent for rapid prototyping"
    },
    {
        id: "6",
        type: "alert",
        date: "Jan 3, 2026",
        topic: "Drift Alert: Rust learning",
        reason: "Confidence rising but evidence unchanged — possible overconfidence"
    },
    {
        id: "7",
        type: "decision",
        date: "Dec 28, 2025",
        topic: "Learn Rust for CLI tools",
        verdict: "explore",
        confidence: 65,
        reason: "Mixed market signal, moderate feasibility"
    }
];

const verdictFilters: (VerdictType | "all")[] = ["all", "pursue", "explore", "watchlist", "ignore"];

export default function HistoryPage() {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [verdictFilter, setVerdictFilter] = useState<VerdictType | "all">("all");
    const [showRevisedOnly, setShowRevisedOnly] = useState(false);

    const selectedEvent = historyEvents.find(e => e.id === selectedEventId);

    const filteredEvents = historyEvents.filter(event => {
        if (showRevisedOnly && event.type !== "revision") return false;
        if (verdictFilter === "all") return true;
        return event.verdict === verdictFilter;
    });

    const getEventIcon = (type: EventType) => {
        switch (type) {
            case "decision": return "⚖️";
            case "journal": return "✍️";
            case "revision": return "🔁";
            case "explore": return "🔍";
            case "alert": return "⚠️";
        }
    };

    const getEventTypeLabel = (type: EventType) => {
        switch (type) {
            case "decision": return "DECISION";
            case "journal": return "JOURNAL";
            case "revision": return "REVISION";
            case "explore": return "EXPLORE";
            case "alert": return "ALERT";
        }
    };

    return (
        <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

            {/* LEFT: FILTERS (260px) */}
            <div style={{
                width: "260px",
                minWidth: "260px",
                borderRight: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

                    {/* Verdict Filter */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Filter by Verdict</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {verdictFilters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setVerdictFilter(filter)}
                                    className={`btn ${verdictFilter === filter ? "btn-secondary" : "btn-ghost"}`}
                                    style={{
                                        justifyContent: "flex-start",
                                        fontSize: "13px",
                                        padding: "8px 12px",
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {filter === "all" ? "All Events" : (
                                        <span className={`verdict-badge verdict-${filter}`} style={{ fontSize: "10px", padding: "3px 10px" }}>
                                            {filter}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Special Filters */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Special Filters</h3>
                        <button
                            onClick={() => setShowRevisedOnly(!showRevisedOnly)}
                            className={`btn ${showRevisedOnly ? "btn-secondary" : "btn-ghost"}`}
                            style={{
                                width: "100%",
                                justifyContent: "flex-start",
                                fontSize: "13px",
                                padding: "8px 12px"
                            }}
                        >
                            🔥 Revised Later
                        </button>
                    </div>

                    {/* Time Range */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Time Range</h3>
                        <select
                            className="input"
                            style={{ fontSize: "13px" }}
                        >
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>Last 3 months</option>
                            <option>Last year</option>
                            <option>All time</option>
                        </select>
                    </div>

                    {/* Confidence Filter */}
                    <div>
                        <h3 className="label mb-3">Confidence Level</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <button className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: "12px", padding: "6px 10px" }}>
                                &gt; 80% (High)
                            </button>
                            <button className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: "12px", padding: "6px 10px" }}>
                                50-80% (Medium)
                            </button>
                            <button className="btn btn-ghost" style={{ justifyContent: "flex-start", fontSize: "12px", padding: "6px 10px" }}>
                                &lt; 50% (Low)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CENTER: TIMELINE (Flex, max 900px) */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", background: "var(--bg-primary)" }}>
                <div style={{ width: "100%", maxWidth: "900px", padding: "32px 48px" }}>

                    {/* Header */}
                    <div style={{ marginBottom: "32px" }}>
                        <h1 className="h1 mb-2">History</h1>
                        <p className="body" style={{ color: "var(--text-secondary)" }}>
                            Your structured timeline of thought, decisions, corrections, and growth.
                        </p>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: "relative" }}>
                        {/* Timeline Line */}
                        <div style={{
                            position: "absolute",
                            left: "0",
                            top: "0",
                            bottom: "0",
                            width: "2px",
                            background: "var(--border-primary)"
                        }} />

                        {/* Events */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingLeft: "32px" }}>
                            {filteredEvents.map((event, index) => (
                                <div
                                    key={event.id}
                                    className="card card-hover"
                                    style={{
                                        padding: "20px",
                                        position: "relative",
                                        cursor: "pointer",
                                        borderLeft: event.type === "revision" ? "3px solid var(--accent-yellow)" :
                                            event.type === "alert" ? "3px solid var(--accent-red)" : "3px solid transparent"
                                    }}
                                    onClick={() => setSelectedEventId(event.id)}
                                >
                                    {/* Timeline Dot */}
                                    <div style={{
                                        position: "absolute",
                                        left: "-44px",
                                        top: "24px",
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        background: event.type === "revision" ? "var(--accent-yellow)" :
                                            event.type === "decision" ? "var(--accent-blue)" :
                                                event.type === "journal" ? "var(--accent-green)" :
                                                    event.type === "alert" ? "var(--accent-red)" : "var(--text-tertiary)",
                                        border: "2px solid var(--bg-primary)"
                                    }} />

                                    {/* Event Header */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                                <span style={{ fontSize: "16px" }}>{getEventIcon(event.type)}</span>
                                                <span className="label" style={{
                                                    color: event.type === "revision" ? "var(--accent-yellow)" : "var(--text-secondary)"
                                                }}>
                                                    {getEventTypeLabel(event.type)}
                                                </span>
                                            </div>
                                            <h3 className="h3">{event.topic}</h3>
                                        </div>
                                        <span className="caption">{event.date}</span>
                                    </div>

                                    {/* Event Content */}
                                    {event.type === "decision" && (
                                        <div>
                                            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                                                <span className={`verdict-badge verdict-${event.verdict}`}>
                                                    {event.verdict}
                                                </span>
                                                <span className="body">Confidence: {event.confidence}%</span>
                                            </div>
                                            <p className="caption">{event.reason}</p>
                                        </div>
                                    )}

                                    {event.type === "journal" && (
                                        <div>
                                            <p className="body mb-2" style={{ fontStyle: "italic", lineHeight: 1.6 }}>
                                                "{event.journalSnippet}"
                                            </p>
                                            {event.linkedTo && (
                                                <div className="caption" style={{ color: "var(--accent-blue)" }}>
                                                    🔗 Linked to: {event.linkedTo}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {event.type === "revision" && event.revision && (
                                        <div style={{
                                            padding: "14px",
                                            background: "var(--bg-secondary)",
                                            borderRadius: "8px"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                                <div>
                                                    <div className="caption mb-1">Original</div>
                                                    <span className={`verdict-badge verdict-${event.revision.original}`} style={{ fontSize: "10px" }}>
                                                        {event.revision.original}
                                                    </span>
                                                    <span className="caption ml-2">{event.revision.originalConfidence}%</span>
                                                </div>
                                                <div style={{ fontSize: "20px", color: "var(--text-muted)" }}>→</div>
                                                <div>
                                                    <div className="caption mb-1">Updated</div>
                                                    <span className={`verdict-badge verdict-${event.revision.updated}`} style={{ fontSize: "10px" }}>
                                                        {event.revision.updated}
                                                    </span>
                                                    <span className="caption ml-2">{event.revision.updatedConfidence}%</span>
                                                </div>
                                            </div>
                                            <div className="caption">
                                                <strong>Why:</strong> {event.revision.changedEvidence}
                                            </div>
                                        </div>
                                    )}

                                    {event.type === "explore" && (
                                        <div>
                                            <div className="body mb-2">Confidence: {event.confidence}%</div>
                                            <p className="caption">{event.reason}</p>
                                        </div>
                                    )}

                                    {event.type === "alert" && (
                                        <div style={{
                                            padding: "12px",
                                            background: "var(--accent-red-muted)",
                                            borderRadius: "6px"
                                        }}>
                                            <p className="caption" style={{ color: "var(--accent-red)" }}>
                                                {event.reason}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                                        <button className="btn btn-ghost btn-sm">View Context</button>
                                        {event.type === "decision" && (
                                            <button className="btn btn-ghost btn-sm">Re-evaluate</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {filteredEvents.length === 0 && (
                        <div className="card text-center" style={{ padding: "64px 32px" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                            <h3 className="h3 mb-2">No events found</h3>
                            <p className="caption">Try adjusting your filters</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: DETAIL / DIFF VIEW (360px) */}
            <div style={{
                width: "360px",
                minWidth: "360px",
                borderLeft: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

                    {!selectedEvent && (
                        <div style={{ textAlign: "center", padding: "32px 16px" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>📊</div>
                            <p className="caption">Select an event to see detailed evolution</p>
                        </div>
                    )}

                    {selectedEvent && (
                        <div className="animate-fade-in">
                            <h3 className="h3 mb-4">Event Details</h3>

                            {/* Evolution Timeline for Revisions */}
                            {selectedEvent.type === "revision" && selectedEvent.revision && (
                                <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
                                    <div className="label mb-3">🧠 Decision Evolution</div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        <div>
                                            <div className="caption mb-2">Original (Jan 5)</div>
                                            <div style={{
                                                padding: "12px",
                                                background: "var(--bg-primary)",
                                                borderRadius: "6px",
                                                borderLeft: `3px solid ${selectedEvent.revision.original === 'pursue' ? 'var(--accent-green)' : 'var(--accent-blue)'}`
                                            }}>
                                                <div style={{ marginBottom: "6px" }}>
                                                    <span className={`verdict-badge verdict-${selectedEvent.revision.original}`} style={{ fontSize: "10px" }}>
                                                        {selectedEvent.revision.original}
                                                    </span>
                                                </div>
                                                <div className="caption mb-1">Confidence: {selectedEvent.revision.originalConfidence}%</div>
                                                <div className="caption">Evidence: Weak market signals</div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "center", fontSize: "20px", color: "var(--text-muted)" }}>
                                            ↓
                                        </div>

                                        <div>
                                            <div className="caption mb-2">Updated (Jan 20)</div>
                                            <div style={{
                                                padding: "12px",
                                                background: "var(--bg-primary)",
                                                borderRadius: "6px",
                                                borderLeft: `3px solid ${selectedEvent.revision.updated === 'ignore' ? 'var(--accent-red)' : 'var(--accent-green)'}`
                                            }}>
                                                <div style={{ marginBottom: "6px" }}>
                                                    <span className={`verdict-badge verdict-${selectedEvent.revision.updated}`} style={{ fontSize: "10px" }}>
                                                        {selectedEvent.revision.updated}
                                                    </span>
                                                </div>
                                                <div className="caption mb-1">Confidence: {selectedEvent.revision.updatedConfidence}%</div>
                                                <div className="caption">New evidence: {selectedEvent.revision.changedEvidence}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="card card-sm" style={{ marginBottom: "16px" }}>
                                <div className="label mb-2">Metadata</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div className="caption">Type: <span className="text-primary">{getEventTypeLabel(selectedEvent.type)}</span></div>
                                    <div className="caption">Date: <span className="text-primary">{selectedEvent.date}</span></div>
                                    {selectedEvent.confidence && (
                                        <div className="caption">Confidence: <span className="text-primary">{selectedEvent.confidence}%</span></div>
                                    )}
                                </div>
                            </div>

                            {/* Intellectual Honesty Badge */}
                            {selectedEvent.type === "revision" && (
                                <div style={{
                                    padding: "14px",
                                    background: "var(--accent-green-muted)",
                                    borderRadius: "8px",
                                    borderLeft: "3px solid var(--accent-green)"
                                }}>
                                    <div className="label mb-2" style={{ color: "var(--accent-green)" }}>
                                        ✓ Intellectual Honesty
                                    </div>
                                    <p className="caption" style={{ color: "var(--accent-green)", lineHeight: 1.5 }}>
                                        This shows you updated your thinking based on new evidence — a sign of good reasoning.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: "16px",
                    borderTop: "1px solid var(--border-primary)",
                    background: "var(--bg-tertiary)"
                }}>
                    <p className="caption" style={{ fontSize: "11px", lineHeight: 1.5, textAlign: "center" }}>
                        <strong>ChatGPT forgets. Axiom accumulates.</strong><br />
                        This is your anti-hallucination page.
                    </p>
                </div>
            </div>
        </div>
    );
}
