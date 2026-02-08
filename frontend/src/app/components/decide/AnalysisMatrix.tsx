'use client';

interface AnalysisData {
    feasibility: string;
    marketSignal: string;
    hypeScore: number;
    riskFactors: string[];
    evidenceSummary: string;
}

interface AnalysisMatrixProps {
    analysis: AnalysisData;
}

export function AnalysisMatrix({ analysis }: AnalysisMatrixProps) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            marginBottom: "24px",
            background: "var(--bg-tertiary)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border-primary)"
        }}>
            <div style={{ textAlign: "center" }}>
                <div className="caption mb-1">Hype Score</div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                    {analysis.hypeScore}<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/10</span>
                </div>
                <div style={{ height: "4px", width: "100%", background: "var(--bg-elevated)", marginTop: "6px", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                        height: "100%",
                        width: `${analysis.hypeScore * 10}%`,
                        background: analysis.hypeScore > 7 ? "var(--accent-red)" : "var(--accent-blue)"
                    }} />
                </div>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid var(--border-primary)", borderRight: "1px solid var(--border-primary)" }}>
                <div className="caption mb-1">Market Signal</div>
                <div style={{ fontSize: "14px", fontWeight: 600, textTransform: "capitalize", color: analysis.marketSignal === 'strong' ? "var(--accent-green)" : "var(--text-primary)" }}>
                    {analysis.marketSignal}
                </div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div className="caption mb-1">Feasibility</div>
                <div style={{ fontSize: "14px", fontWeight: 600, textTransform: "capitalize" }}>
                    {analysis.feasibility}
                </div>
            </div>
        </div>
    );
}
