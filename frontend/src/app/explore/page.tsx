"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Types
type ExploreMode = "trending" | "emerging" | "personalized" | "contrarian";
type CardType = "trend" | "weak-signal" | "hype-warning" | "connection";
type Domain = "tech" | "ai" | "web" | "systems" | "research" | "startups";

type ExploreCard = {
    id: string;
    type: CardType;
    topic: string;
    summary: string;
    signals: {
        market: "growing" | "stable" | "declining";
        friction: "low" | "medium" | "high";
        freshness: "safe" | "moderate" | "outdated";
        confidence: number;
    };
    whyItMatters: string[];
    meta: {
        sources: number;
        seenIn: string[];
        lastUpdated: string;
    };
    relatedMemory?: string;
};

const demoCards: ExploreCard[] = [
    {
        id: "1",
        type: "trend",
        topic: "Rust for Systems Programming",
        summary: "Memory-safe systems language gaining enterprise adoption, especially for CLI tools and infrastructure.",
        signals: {
            market: "growing",
            friction: "medium",
            freshness: "safe",
            confidence: 0.82
        },
        whyItMatters: [
            "Eliminates memory bugs without garbage collection",
            "Growing job market in infrastructure roles",
            "Early adoption phase — good entry point"
        ],
        meta: {
            sources: 8,
            seenIn: ["Jobs", "GitHub", "Tech blogs"],
            lastUpdated: "Jan 2026"
        }
    },
    {
        id: "2",
        type: "weak-signal",
        topic: "HTMX for Simple Web Apps",
        summary: "Hypermedia-driven approach to web apps without heavy JavaScript frameworks.",
        signals: {
            market: "stable",
            friction: "low",
            freshness: "safe",
            confidence: 0.65
        },
        whyItMatters: [
            "Reduces frontend complexity dramatically",
            "Contrarian to SPA trend but pragmatic",
            "Low friction, high velocity for solo devs"
        ],
        meta: {
            sources: 4,
            seenIn: ["GitHub", "Indie hackers"],
            lastUpdated: "Dec 2025"
        },
        relatedMemory: "You explored Django templates last month"
    },
    {
        id: "3",
        type: "hype-warning",
        topic: "Web3 Development Frameworks",
        summary: "Blockchain development tools seeing high noise-to-signal ratio.",
        signals: {
            market: "declining",
            friction: "high",
            freshness: "moderate",
            confidence: 0.48
        },
        whyItMatters: [
            "High buzz but unclear product-market fit",
            "Friction remains extremely high",
            "Market cooling significantly"
        ],
        meta: {
            sources: 12,
            seenIn: ["Twitter", "VC blogs"],
            lastUpdated: "Feb 2026"
        }
    },
    {
        id: "4",
        type: "connection",
        topic: "Temporal Workflow Engine",
        summary: "Distributed workflow orchestration for long-running processes.",
        signals: {
            market: "growing",
            friction: "medium",
            freshness: "safe",
            confidence: 0.71
        },
        whyItMatters: [
            "Solves distributed state management",
            "Related to your FastAPI exploration",
            "Enterprise-proven, developer-friendly"
        ],
        meta: {
            sources: 5,
            seenIn: ["Jobs", "Engineering blogs"],
            lastUpdated: "Jan 2026"
        },
        relatedMemory: "Connects to your 'Async task processing' journal entry"
    }
];

const domains: Domain[] = ["tech", "ai", "web", "systems", "research", "startups"];

export default function ExplorePage() {
    const router = useRouter();

    // Left Panel State
    const [exploreMode, setExploreMode] = useState<ExploreMode>("personalized");
    const [selectedDomains, setSelectedDomains] = useState<Domain[]>(["tech", "web"]);
    const [timeHorizon, setTimeHorizon] = useState("3-6-months");
    const [signalStrength, setSignalStrength] = useState(50); // 0 = weak, 100 = strong

    // Cards State
    const [cards] = useState<ExploreCard[]>(demoCards);
    const [selectedCard, setSelectedCard] = useState<ExploreCard | null>(null);

    // Right Panel State
    const [activeTab, setActiveTab] = useState<"memory" | "why" | "agent">("why");

    const toggleDomain = (domain: Domain) => {
        setSelectedDomains(prev =>
            prev.includes(domain)
                ? prev.filter(d => d !== domain)
                : [...prev, domain]
        );
    };

    const handleSendToDecide = (card: ExploreCard) => {
        // Navigate to Decide with pre-filled context
        router.push(`/decide?topic=${encodeURIComponent(card.topic)}&source=explore`);
    };

    const handleSaveToJournal = (card: ExploreCard) => {
        alert(`Saved "${card.topic}" to Journal with context and signals`);
        // TODO: Actual API call
    };

    const getCardIcon = (type: CardType) => {
        switch (type) {
            case "trend": return "🔥";
            case "weak-signal": return "🌱";
            case "hype-warning": return "⚠️";
            case "connection": return "🧩";
        }
    };

    const getSignalColor = (value: string) => {
        if (value === "growing" || value === "low" || value === "safe") return "var(--accent-green)";
        if (value === "stable" || value === "medium" || value === "moderate") return "var(--accent-yellow)";
        return "var(--accent-red)";
    };

    return (
        <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

            {/* LEFT: EXPLORE CONTROLS (260px) */}
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

                    {/* Explore Mode */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Explore Mode</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {[
                                { id: "personalized", icon: "🎯", label: "Personalized" },
                                { id: "trending", icon: "🔥", label: "Trending" },
                                { id: "emerging", icon: "🌱", label: "Emerging" },
                                { id: "contrarian", icon: "🧪", label: "Contrarian" }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setExploreMode(mode.id as ExploreMode)}
                                    className={`btn ${exploreMode === mode.id ? "btn-secondary" : "btn-ghost"}`}
                                    style={{
                                        justifyContent: "flex-start",
                                        fontSize: "13px",
                                        padding: "8px 12px"
                                    }}
                                >
                                    <span style={{ marginRight: "8px" }}>{mode.icon}</span>
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Domain Filters */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Domains</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {domains.map(domain => (
                                <button
                                    key={domain}
                                    onClick={() => toggleDomain(domain)}
                                    className={`btn btn-sm ${selectedDomains.includes(domain) ? "btn-secondary" : "btn-ghost"}`}
                                    style={{
                                        fontSize: "11px",
                                        padding: "4px 10px",
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {domain}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Horizon */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-3">Time Horizon</h3>
                        <select
                            value={timeHorizon}
                            onChange={(e) => setTimeHorizon(e.target.value)}
                            className="input"
                            style={{ fontSize: "13px" }}
                        >
                            <option value="this-month">This month</option>
                            <option value="3-6-months">3–6 months</option>
                            <option value="1-2-years">1–2 years</option>
                        </select>
                    </div>

                    {/* Signal Strength */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3 className="label mb-2">Signal Strength</h3>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
                            <span className="caption">Weak</span>
                            <span className="caption">Strong</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={signalStrength}
                            onChange={(e) => setSignalStrength(parseInt(e.target.value))}
                            style={{ width: "100%" }}
                        />
                    </div>

                    {/* Saved Streams */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h3 className="label">Saved Streams</h3>
                            <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: "12px" }}>+</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {["AI infra", "Career growth"].map(stream => (
                                <button key={stream} className="btn btn-ghost" style={{
                                    justifyContent: "flex-start",
                                    fontSize: "12px",
                                    padding: "6px 10px"
                                }}>
                                    📌 {stream}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CENTER: EXPLORE FEED (Flex, max 900px) */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", background: "var(--bg-primary)" }}>
                <div style={{ width: "100%", maxWidth: "900px", padding: "32px 48px" }}>

                    {/* Header */}
                    <div style={{ marginBottom: "24px" }}>
                        <h1 className="h1 mb-2">Explore</h1>
                        <p className="body" style={{ color: "var(--text-secondary)" }}>
                            Discover what deserves a decision — personalized, evidence-grounded, memory-aware.
                        </p>
                    </div>

                    {/* Explore Cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {cards.map(card => (
                            <div
                                key={card.id}
                                className="card card-hover"
                                style={{
                                    padding: "20px",
                                    borderLeft: card.type === "hype-warning" ? "3px solid var(--accent-red)" :
                                        card.type === "weak-signal" ? "3px solid var(--accent-green)" :
                                            card.type === "connection" ? "3px solid var(--accent-blue)" : "3px solid transparent"
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                            <span style={{ fontSize: "18px" }}>{getCardIcon(card.type)}</span>
                                            <h3 className="h3">{card.topic}</h3>
                                        </div>
                                        <p className="body" style={{ color: "var(--text-secondary)" }}>{card.summary}</p>
                                    </div>
                                </div>

                                {/* Signals Row */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(4, 1fr)",
                                    gap: "12px",
                                    marginBottom: "16px",
                                    padding: "12px",
                                    background: "var(--bg-secondary)",
                                    borderRadius: "8px"
                                }}>
                                    <div>
                                        <div className="caption mb-1">Market</div>
                                        <div style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: getSignalColor(card.signals.market),
                                            textTransform: "capitalize"
                                        }}>
                                            {card.signals.market === "growing" ? "↑ " : card.signals.market === "declining" ? "↓ " : "→ "}
                                            {card.signals.market}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="caption mb-1">Friction</div>
                                        <div style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: getSignalColor(card.signals.friction),
                                            textTransform: "capitalize"
                                        }}>
                                            {card.signals.friction}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="caption mb-1">Freshness</div>
                                        <div style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: getSignalColor(card.signals.freshness),
                                            textTransform: "capitalize"
                                        }}>
                                            {card.signals.freshness}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="caption mb-1">Confidence</div>
                                        <div style={{ fontSize: "12px", fontWeight: 600 }}>
                                            {(card.signals.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Why It Matters */}
                                <div style={{ marginBottom: "16px" }}>
                                    <div className="label mb-2">Why it matters</div>
                                    <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                        {card.whyItMatters.map((reason, i) => (
                                            <li key={i} className="body" style={{ marginBottom: "4px", lineHeight: 1.5 }}>
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Related Memory */}
                                {card.relatedMemory && (
                                    <div style={{
                                        padding: "10px 12px",
                                        background: "var(--accent-blue-muted)",
                                        borderRadius: "6px",
                                        marginBottom: "16px",
                                        borderLeft: "2px solid var(--accent-blue)"
                                    }}>
                                        <div className="caption" style={{ color: "var(--accent-blue)" }}>
                                            🧠 Memory: {card.relatedMemory}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <button
                                        onClick={() => setSelectedCard(card)}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Explore Deeper
                                    </button>
                                    <button
                                        onClick={() => handleSendToDecide(card)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        → Decide
                                    </button>
                                    <button
                                        onClick={() => handleSaveToJournal(card)}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        💾 Save
                                    </button>
                                    <button className="btn btn-ghost btn-sm">
                                        Track
                                    </button>
                                </div>

                                {/* Meta Footer */}
                                <div style={{
                                    marginTop: "12px",
                                    paddingTop: "12px",
                                    borderTop: "1px solid var(--border-primary)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "11px",
                                    color: "var(--text-muted)"
                                }}>
                                    <span>{card.meta.sources} sources</span>
                                    <span>Seen in: {card.meta.seenIn.join(", ")}</span>
                                    <span>Updated: {card.meta.lastUpdated}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: INSIGHT & MEMORY (360px) */}
            <div style={{
                width: "360px",
                minWidth: "360px",
                borderLeft: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}>

                {/* Tabs */}
                <div style={{
                    display: "flex",
                    borderBottom: "1px solid var(--border-primary)"
                }}>
                    {(["why", "memory", "agent"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="btn btn-ghost"
                            style={{
                                flex: 1,
                                borderRadius: 0,
                                borderBottom: activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
                                fontSize: "12px",
                                textTransform: "capitalize",
                                padding: "12px"
                            }}
                        >
                            {tab === "why" ? "Why This?" : tab === "memory" ? "Memory" : "Agent"}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

                    {activeTab === "why" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <h3 className="label mb-3">Why you're seeing these signals</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div className="card card-sm">
                                        <div className="body mb-1">✓ You're a <strong>Backend dev</strong></div>
                                        <div className="caption">Profile match</div>
                                    </div>
                                    <div className="card card-sm">
                                        <div className="body mb-1">✓ You explored <strong>Redis + scaling</strong></div>
                                        <div className="caption">Related to current cards</div>
                                    </div>
                                    <div className="card card-sm">
                                        <div className="body mb-1">✓ <strong>{exploreMode === "personalized" ? "Personalized" : "Trending"}</strong> mode active</div>
                                        <div className="caption">Prioritizing {exploreMode === "personalized" ? "relevance" : "popularity"}</div>
                                    </div>
                                    <div className="card card-sm">
                                        <div className="body mb-1">✓ Risk tolerance: <strong>Medium</strong></div>
                                        <div className="caption">Balancing safety and opportunity</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: "12px",
                                background: "var(--bg-tertiary)",
                                borderRadius: "8px",
                                border: "1px dashed var(--border-primary)"
                            }}>
                                <div className="caption" style={{ fontStyle: "italic", lineHeight: 1.5 }}>
                                    <strong>This is not ChatGPT.</strong> These cards are evidence-weighted, memory-aware, and personalized to your exploration history.
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "memory" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="label mb-2">Related to your past</h3>

                            <div className="card card-sm card-hover" style={{ cursor: "pointer" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <div className="font-medium" style={{ fontSize: "13px" }}>FastAPI Decision</div>
                                    <span className="verdict-badge verdict-pursue" style={{ fontSize: "9px" }}>pursue</span>
                                </div>
                                <div className="caption mb-2">You decided to pursue FastAPI 2 days ago</div>
                                <div className="caption" style={{ fontSize: "11px", color: "var(--accent-blue)" }}>
                                    → Temporal connects to async workflows
                                </div>
                            </div>

                            <div className="card card-sm card-hover" style={{ cursor: "pointer" }}>
                                <div className="font-medium mb-1" style={{ fontSize: "13px" }}>Journal: Async task processing</div>
                                <div className="caption">You explored this topic 14 days ago</div>
                            </div>

                            <div className="card card-sm" style={{ background: "var(--accent-yellow-muted)", borderColor: "var(--accent-yellow)" }}>
                                <div className="caption" style={{ color: "var(--accent-yellow)" }}>
                                    ⚠️ You previously ignored Kubernetes — Temporal has similar complexity
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "agent" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <h3 className="label mb-2">Agent Actions</h3>

                            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                                📝 Summarize today's signals
                            </button>
                            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                                🧪 Find one contrarian idea
                            </button>
                            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                                📧 Generate daily digest
                            </button>
                            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                                🎓 Create learning path
                            </button>

                            <div style={{
                                marginTop: "16px",
                                padding: "12px",
                                background: "var(--bg-tertiary)",
                                borderRadius: "8px"
                            }}>
                                <div className="label mb-2">Last Run</div>
                                <div className="caption">Daily digest sent 8h ago</div>
                                <div className="caption mt-1">3 new weak signals identified</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* EXPLORE DETAIL MODAL */}
            {selectedCard && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 200,
                        padding: "32px"
                    }}
                    onClick={() => setSelectedCard(null)}
                >
                    <div
                        className="card animate-fade-in"
                        style={{
                            width: "100%",
                            maxWidth: "800px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            padding: "32px"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
                            <div>
                                <h2 className="h1 mb-2">{selectedCard.topic}</h2>
                                <p className="body" style={{ color: "var(--text-secondary)" }}>{selectedCard.summary}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCard(null)}
                                className="btn btn-ghost"
                                style={{ padding: "8px" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <h3 className="h3 mb-3">What makes this worth exploring?</h3>
                            <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                {selectedCard.whyItMatters.map((reason, i) => (
                                    <li key={i} className="body" style={{ marginBottom: "8px", lineHeight: 1.6 }}>
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <h3 className="h3 mb-3">Evidence Timeline</h3>
                            <div className="card" style={{ padding: "16px", background: "var(--bg-tertiary)" }}>
                                <div className="caption">
                                    First appeared: Dec 2025<br />
                                    Peak mentions: Jan 2026<br />
                                    Trend: {selectedCard.signals.market}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <button
                                onClick={() => {
                                    handleSendToDecide(selectedCard);
                                    setSelectedCard(null);
                                }}
                                className="btn btn-primary"
                            >
                                Send to Decide →
                            </button>
                            <button
                                onClick={() => {
                                    handleSaveToJournal(selectedCard);
                                    setSelectedCard(null);
                                }}
                                className="btn btn-secondary"
                            >
                                💾 Save to Journal
                            </button>
                            <button className="btn btn-secondary">
                                📌 Track This
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
