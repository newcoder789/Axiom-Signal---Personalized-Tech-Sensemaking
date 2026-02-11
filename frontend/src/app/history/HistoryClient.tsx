"use client";

import { useState } from "react";

// Types matching the component logic
export type EventType = "decision" | "journal" | "revision" | "explore" | "alert";
export type VerdictType = "pursue" | "explore" | "watchlist" | "ignore";

export type HistoryEvent = {
    id: string;
    type: EventType;
    date: string;
    topic: string; // usually thought.title
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

const verdictFilters: (VerdictType | "all")[] = ["all", "pursue", "explore", "watchlist", "ignore"];

export default function HistoryClient({ events }: { events: HistoryEvent[] }) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [verdictFilter, setVerdictFilter] = useState<VerdictType | "all">("all");
    const [showRevisedOnly, setShowRevisedOnly] = useState(false);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    const filteredEvents = events.filter(event => {
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
                                                <span className="body">Confidence: {event.confidence ? parseFloat(event.confidence.toString()).toFixed(0) : 0}%</span>
                                            </div>
                                            <p className="caption">{event.reason}</p>
                                        </div>
                                    )}

                                    {event.type === "journal" && (
                                        <div>
                                            <p className="body mb-2" style={{ fontStyle: "italic", lineHeight: 1.6 }}>
                                                "{event.journalSnippet}"
                                            </p>
                                        </div>
                                    )}

                                    {event.type === "explore" && (
                                        <div>
                                            <div className="body mb-2">Confidence: {event.confidence ? parseFloat(event.confidence.toString()).toFixed(0) : 0}%</div>
                                            <p className="caption">{event.reason}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                                        <button className="btn btn-ghost btn-sm">View Context</button>
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
                        <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
                            <h3 className="h3 mb-4">Technical Snapshot</h3>

                            {/* Key Stats Card */}
                            <div className="card card-sm" style={{ marginBottom: '24px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div className="label mb-2" style={{ color: 'var(--accent-blue)' }}>Axiom Pulse</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {selectedEvent.verdict?.toUpperCase() || "RECORDED"}
                                    </div>
                                    <div className="caption" style={{ opacity: 0.8 }}>
                                        Confidence: <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.confidence || 0}%</span>
                                    </div>
                                    <div className="caption" style={{ opacity: 0.8 }}>
                                        Impact Score: <span style={{ color: 'var(--text-primary)' }}>{(selectedEvent.confidence || 0) > 80 ? 'HIGH' : 'MEDIUM'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Executive Summary Section */}
                            <div style={{ marginBottom: '24px' }}>
                                <h4 className="label mb-2" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>EXECUTIVE SUMMARY</h4>
                                <div style={{
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-primary)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    {selectedEvent.type === 'decision' ? (
                                        <>
                                            <strong>{selectedEvent.topic}</strong>: Evaluated with a <strong>{selectedEvent.verdict}</strong> verdict.
                                            The reasoning centers on <em>{selectedEvent.reason}</em>.
                                            This represents a strategic {(selectedEvent.confidence || 0) > 70 ? 'commitment' : 'exploration'} in the technical journey.
                                        </>
                                    ) : (
                                        <>
                                            Recorded as a <strong>{selectedEvent.topic}</strong> entry.
                                            Initial reflection: <span style={{ fontStyle: 'italic' }}>"{selectedEvent.journalSnippet}"</span>.
                                            This serves as foundational evidence for future architectural pivots.
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Metadata List */}
                            <div className="card card-sm">
                                <div className="label mb-2">Metadata</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <div className="caption">Event ID: <span className="text-primary" style={{ fontSize: '10px' }}>{selectedEvent.id}</span></div>
                                    <div className="caption">Timeline: <span className="text-primary">{selectedEvent.date}</span></div>
                                    <div className="caption">Status: <span className="text-primary">Archived & Indexed</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
