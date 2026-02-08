'use client';

interface ReasoningDisplayProps {
    reasoning: string;
}

export function ReasoningDisplay({ reasoning }: ReasoningDisplayProps) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <div className="label mb-2" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🧐 Scout's Analysis</span>
            </div>
            <div style={{
                position: "relative",
                padding: "16px 20px",
                background: "var(--bg-elevated)",
                borderRadius: "0 12px 12px 12px",
                borderLeft: "3px solid var(--accent-blue)"
            }}>
                <p className="body" style={{ lineHeight: 1.7, fontSize: "15px" }}>{reasoning}</p>
            </div>
        </div>
    );
}
