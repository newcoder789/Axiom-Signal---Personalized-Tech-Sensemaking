import Link from "next/link";
import { getActiveDecisions, getDashboardStats, getJournals } from "@/lib/actions";
import { QuickCapture } from "./components/dashboard/QuickCapture";
import { getActiveFocusSession } from "@/lib/actions/focus";
import { InsightsSection } from "./components/dashboard/InsightsSection";

// Simple date formatter
function formatTimeAgo(date: Date | string | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [stats, decisions, journals, activeSession] = await Promise.all([
    getDashboardStats(),
    getActiveDecisions(),
    getJournals(),
    getActiveFocusSession()
  ]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* LEFT: STREAMS (240px) */}
      <div style={{
        width: "240px",
        minWidth: "240px",
        borderRight: "1px solid var(--border-primary)",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>

          {/* Streams (Journals) */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 className="label" style={{ color: "var(--text-secondary)" }}>Journals</h3>
              <Link href="/journal" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "12px" }}>+</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {journals.map(journal => (
                <Link
                  key={journal.id}
                  href={`/journal/${journal.id}`}
                  className="nav-link"
                  style={{
                    justifyContent: "space-between",
                    padding: "10px 12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px" }}>{journal.icon}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{journal.title}</span>
                  </div>
                </Link>
              ))}
              {journals.length === 0 && (
                <div className="caption p-2 italic text-center">No journals yet</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: "auto" }}>
            <h3 className="label mb-4" style={{ color: "var(--text-secondary)" }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/journal" className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start", position: "relative" }}>
                ✍️ Continue Journal
              </Link>
              <Link href="/decide" className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                ⚖️ Make Decision
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: DASHBOARD (Flex) */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px" }}>

          {/* Header */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "12px", height: "12px", background: "var(--accent-gold)", borderRadius: "3px", boxShadow: "0 0 10px var(--accent-gold)" }}></div>
              <h1 className="h1" style={{ fontSize: "28px" }}>Dashboard</h1>
            </div>
            <p className="body-secondary">
              Managing your cognitive bandwidth and tech roadmap.
            </p>
          </div>

          <QuickCapture />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
            {/* Main Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* 1. Current Focus */}
              <div className={`card ${activeSession ? 'card-premium' : ''}`} style={{
                padding: "24px",
                borderLeft: activeSession ? "4px solid var(--accent-green)" : "1px solid var(--border-primary)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="label mb-3" style={{ color: activeSession ? "var(--accent-green)" : "var(--text-tertiary)" }}>
                      🎯 {activeSession ? "Active Focus" : "Operational State"}
                    </div>
                    {activeSession ? (
                      <>
                        <h2 className="h2 mb-3" style={{ fontSize: "20px" }}>{activeSession.title}</h2>
                        <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
                          <div>
                            <div className="caption">Session</div>
                            <div className="body" style={{ color: "var(--accent-green)", fontWeight: 600 }}>In Deep Work</div>
                          </div>
                          <div>
                            <div className="caption">Target</div>
                            <div className="body">{activeSession.targetDurationMinutes} min remaining</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="h2 mb-2">Systems Ready</h2>
                        <p className="caption">
                          Select a decision to initiate a focus session and detect drift.
                        </p>
                      </>
                    )}
                  </div>
                  <Link
                    href={activeSession ? `/focus?thought=${activeSession.thoughtId}` : "/focus"}
                    className={activeSession ? "btn btn-primary" : "btn btn-secondary"}
                    style={activeSession ? { background: "var(--accent-green)", color: "#000", fontWeight: 600 } : {}}
                  >
                    {activeSession ? "Resume Session →" : "Start Session →"}
                  </Link>
                </div>
              </div>

              {/* 2. Active Decisions */}
              <div className="card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div className="label">🧠 Strategic Decisions</div>
                  <Link href="/history" className="btn btn-ghost btn-sm">
                    Full Ledger →
                  </Link>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {decisions.length === 0 && (
                    <div className="caption italic p-4 text-center glass rounded-lg">No active decisions. Start one in "Make Decision".</div>
                  )}
                  {decisions.map(decision => (
                    <div
                      key={decision.id}
                      className={`glass ${decision.verdict === 'pursue' ? 'card-gold' : ''}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        border: decision.verdict === 'pursue' ? "1px solid var(--accent-gold-muted)" : "1px solid rgba(255,255,255,0.05)"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span className="body" style={{ fontWeight: 600 }}>{decision.title}</span>
                          <span className={`verdict-badge verdict-${decision.verdict || 'explore'}`}>
                            {decision.verdict || 'pending'}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <span className="caption" style={{ color: "var(--text-tertiary)" }}>Confidence: {decision.confidence ? parseFloat(decision.confidence.toString()).toFixed(0) : 0}%</span>
                          <span className="caption" style={{ color: "var(--text-tertiary)" }}>{formatTimeAgo(decision.updatedAt || decision.createdAt)}</span>
                        </div>
                      </div>
                      <Link href={`/journal/${decision.journalId}/write?thought=${decision.id}`} className="btn btn-ghost btn-sm" style={{ color: "var(--accent-gold)" }}>
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Meta-Insights */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <InsightsSection decisions={decisions} />

              {/* Stats Mini Grid */}
              <div className="grid-2">
                <div className="card glass text-center" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-gold)" }}>{stats.totalDecisions}</div>
                  <div className="caption">Analyses</div>
                </div>
                <div className="card glass text-center" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-green)" }}>{stats.verdictCounts['pursue'] || 0}</div>
                  <div className="caption">Pursuits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
