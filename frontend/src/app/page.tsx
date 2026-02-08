"use client";

import { useState } from "react";
import Link from "next/link";

// Types
type VerdictType = "pursue" | "explore" | "watchlist" | "ignore";

type ActiveDecision = {
  id: string;
  topic: string;
  verdict: VerdictType;
  confidence: number;
  timeline?: string;
  decidedAt: string;
};

type WatchlistAlert = {
  topic: string;
  change: string;
  severity: "high" | "medium" | "low";
};

type Stream = {
  id: string;
  name: string;
  icon: string;
  count: number;
};

const activeDecisions: ActiveDecision[] = [
  { id: "1", topic: "PostgreSQL 17 adoption", verdict: "watchlist", confidence: 62, timeline: "re-evaluate in 3 months", decidedAt: "2 days ago" },
  { id: "2", topic: "Redis vs Kafka", verdict: "pursue", confidence: 88, timeline: "now", decidedAt: "1 week ago" },
  { id: "3", topic: "Vector DB choice", verdict: "explore", confidence: 65, decidedAt: "3 days ago" },
];

const watchlistAlerts: WatchlistAlert[] = [
  { topic: "PostgreSQL 17", change: "New adoption signals detected", severity: "medium" },
  { topic: "LLM agents", change: "Hype decreasing, tooling stabilizing", severity: "low" },
];

const streams: Stream[] = [
  { id: "1", name: "My Startup", icon: "🚀", count: 12 },
  { id: "2", name: "Career Growth", icon: "📈", count: 8 },
  { id: "3", name: "AI Infra", icon: "🧠", count: 15 },
  { id: "4", name: "Learning ML", icon: "🎓", count: 5 },
];

const recentInsights = [
  "You tend to pursue low-friction tools faster than high-upside ones",
  "3 topics you ignored later gained traction",
  "Your confidence increases when market signals align with hiring data"
];

export default function DashboardPage() {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* LEFT: FOCUS & STREAMS (280px) */}
      <div style={{
        width: "280px",
        minWidth: "280px",
        borderRight: "1px solid var(--border-primary)",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

          {/* Streams */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 className="label">Streams</h3>
              <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "12px" }}>+</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {streams.map(stream => (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream.id === selectedStream ? null : stream.id)}
                  className={`btn ${selectedStream === stream.id ? "btn-secondary" : "btn-ghost"}`}
                  style={{
                    justifyContent: "space-between",
                    fontSize: "13px",
                    padding: "10px 12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{stream.icon}</span>
                    <span>{stream.name}</span>
                  </div>
                  <span className="caption">{stream.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Journal Shortcuts */}
          <div>
            <h3 className="label mb-3">Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/journal" className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                ✍️ Continue Journal
              </Link>
              <Link href="/decide" className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }}>
                ⚖️ Make Decision
              </Link>
              <Link href="/explore" className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }}>
                🔍 Explore Topics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: NOW PANEL (Flex, max 900px) */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ width: "100%", maxWidth: "900px", padding: "32px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: "32px" }}>
            <h1 className="h1 mb-2">Dashboard</h1>
            <p className="body" style={{ color: "var(--text-secondary)" }}>
              Your thinking state, direction, and open loops.
            </p>
          </div>

          {/* 1. Current Focus */}
          <div className="card mb-6" style={{
            padding: "24px",
            borderLeft: "4px solid var(--accent-blue)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
              <div>
                <div className="label mb-2">🎯 Current Focus</div>
                <h2 className="h2 mb-2">Building AI-powered journaling product</h2>
                <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                  <div>
                    <div className="caption">Stage</div>
                    <div className="body">Early exploration</div>
                  </div>
                  <div>
                    <div className="caption">Last activity</div>
                    <div className="body">2 hours ago</div>
                  </div>
                  <div>
                    <div className="caption">Confidence trend</div>
                    <div className="body" style={{ color: "var(--accent-green)" }}>↑ improving</div>
                  </div>
                </div>
              </div>
              <Link href="/focus" className="btn btn-primary">
                Continue →
              </Link>
            </div>

            {/* Mini Progress */}
            <div style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-primary)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span className="caption">Overall progress</span>
                <span className="caption">68%</span>
              </div>
              <div style={{
                height: "6px",
                background: "var(--bg-elevated)",
                borderRadius: "3px",
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: "68%",
                  background: "var(--accent-blue)"
                }} />
              </div>
            </div>
          </div>

          {/* 2. Active Decisions */}
          <div className="card mb-6" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="label">🧠 Active Decisions</div>
              <Link href="/history" className="btn btn-ghost btn-sm">
                View All →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeDecisions.map(decision => (
                <div
                  key={decision.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-primary)"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span className="body font-medium">{decision.topic}</span>
                      <span className={`verdict-badge verdict-${decision.verdict}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                        {decision.verdict}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <span className="caption">Confidence: {decision.confidence}%</span>
                      {decision.timeline && <span className="caption">{decision.timeline}</span>}
                      <span className="caption">{decision.decidedAt}</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">
                    Re-open
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Recent Insights */}
          <div className="card" style={{ padding: "24px", background: "var(--bg-secondary)" }}>
            <div className="label mb-4">💡 Recent Insights</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {recentInsights.map((insight, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: "12px",
                  padding: "14px",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                  borderLeft: "3px solid var(--accent-yellow)"
                }}>
                  <span style={{
                    fontSize: "20px",
                    flexShrink: 0,
                    opacity: 0.6
                  }}>💡</span>
                  <p className="body" style={{ lineHeight: 1.6 }}>
                    {insight}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-primary)",
              textAlign: "center"
            }}>
              <p className="caption" style={{ fontStyle: "italic" }}>
                This is meta-reasoning about your thinking patterns — ChatGPT cannot do this.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: SIGNALS & ALERTS (360px) */}
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

          {/* Watchlist Alerts */}
          <div style={{ marginBottom: "24px" }}>
            <div className="label mb-3">⚠️ Watchlist Updates</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {watchlistAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="card card-sm card-hover"
                  style={{
                    cursor: "pointer",
                    borderLeft: alert.severity === "high" ? "3px solid var(--accent-red)" :
                      alert.severity === "medium" ? "3px solid var(--accent-yellow)" : "3px solid var(--accent-blue)"
                  }}
                >
                  <div className="font-medium mb-1" style={{ fontSize: "13px" }}>{alert.topic}</div>
                  <div className="caption">{alert.change}</div>
                </div>
              ))}
            </div>

            <button className="btn btn-ghost btn-sm mt-3" style={{ width: "100%" }}>
              View All Watchlist Items →
            </button>
          </div>

          {/* Thinking Health */}
          <div className="card" style={{ padding: "16px" }}>
            <div className="label mb-3">📊 Thinking Health</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="caption">Overconfidence risk</span>
                  <span className="caption font-medium" style={{ color: "var(--accent-yellow)" }}>Medium</span>
                </div>
                <div style={{
                  height: "4px",
                  background: "var(--bg-elevated)",
                  borderRadius: "2px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: "50%",
                    background: "var(--accent-yellow)"
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="caption">Exploration diversity</span>
                  <span className="caption font-medium" style={{ color: "var(--accent-red)" }}>Low</span>
                </div>
                <div style={{
                  height: "4px",
                  background: "var(--bg-elevated)",
                  borderRadius: "2px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: "25%",
                    background: "var(--accent-red)"
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="caption">Recency bias</span>
                  <span className="caption font-medium" style={{ color: "var(--accent-yellow)" }}>Detected</span>
                </div>
                <div style={{
                  height: "4px",
                  background: "var(--bg-elevated)",
                  borderRadius: "2px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: "60%",
                    background: "var(--accent-yellow)"
                  }} />
                </div>
              </div>
            </div>

            <div style={{
              marginTop: "16px",
              padding: "10px",
              background: "var(--bg-tertiary)",
              borderRadius: "6px"
            }}>
              <p className="caption" style={{ fontSize: "11px", lineHeight: 1.5 }}>
                <strong>Axiom-special:</strong> ChatGPT will never tell you you're biased over time.
              </p>
            </div>
          </div>

          {/* Stats Summary */}
          <div style={{
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px"
          }}>
            <div className="card card-sm text-center">
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-green)" }}>23</div>
              <div className="caption mt-1">Decisions</div>
            </div>
            <div className="card card-sm text-center">
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-blue)" }}>8</div>
              <div className="caption mt-1">Patterns</div>
            </div>
            <div className="card card-sm text-center">
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-yellow)" }}>15</div>
              <div className="caption mt-1">Assumptions</div>
            </div>
            <div className="card card-sm text-center">
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>7</div>
              <div className="caption mt-1">Day streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
