import { NextRequest, NextResponse } from "next/server";

// Backend API URL - if not set, use demo mode
const BACKEND_URL = process.env.BACKEND_URL;
const DEMO_MODE = !BACKEND_URL || BACKEND_URL === "demo";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const {
        topic,
        user_profile,
        experience_level,
        risk_tolerance,
        current_status,
        additional_notes
    } = body;

    if (!topic || !topic.trim()) {
        return NextResponse.json(
            { error: "Topic is required" },
            { status: 400 }
        );
    }

    // If in demo mode or no backend URL, return demo data immediately
    if (DEMO_MODE) {
        console.log('🎭 Demo mode - returning mock verdict');
        const verdict = getDemoVerdict(topic, user_profile, risk_tolerance);
        return NextResponse.json({ ...verdict, isDemo: true });
    }

    try {
        // Call Python backend /api/verdict endpoint
        console.log(`🔗 Calling backend: ${BACKEND_URL}/api/verdict`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(`${BACKEND_URL}/api/verdict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: topic.trim(),
                content: additional_notes || "",
                context: {
                    profile: user_profile || "Backend dev",
                    experienceLevel: experience_level || "2 years",
                    riskTolerance: risk_tolerance || "medium",
                    currentStatus: current_status || "",
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Backend response received');

        // HYBRID MODE: If backend is missing visualization data, inject mock data
        // This ensures the frontend doesn't crash while backend is still being updated
        if (!data.reasoningGraph) {
            console.log('⚠️ Injecting mock graph for visualization');
            const { nodes, edges } = generateDemoGraph(data.verdict || 'explore', topic);
            data.reasoningGraph = { nodes, edges };
        }

        if (!data.confidenceHistory) {
            console.log('⚠️ Injecting mock confidence history');
            data.confidenceHistory = generateDemoConfidenceHistory(data.confidence || 75);
        }

        if (!data.memory_matches) {
            console.log('⚠️ Injecting mock memory matches');
            data.memory_matches = generateDemoMemoryMatches(topic);
        }

        return NextResponse.json({ ...data, isDemo: false });
    } catch (error) {
        console.error("❌ Backend unavailable, using demo mode:", error);
        const verdict = getDemoVerdict(topic, user_profile, risk_tolerance);
        return NextResponse.json({ ...verdict, isDemo: true });
    }
}

function getDemoVerdict(topic: string, userProfile?: string, riskTolerance?: string) {
    const isOutdated = topic.toLowerCase().includes("17") || topic.toLowerCase().includes("kubernetes 1");
    const isHighFriction = topic.toLowerCase().includes("zig") || (topic.toLowerCase().includes("rust") && !topic.toLowerCase().includes("web"));
    const isLowFriction = topic.toLowerCase().includes("fastapi") || topic.toLowerCase().includes("react");

    let verdict: "pursue" | "explore" | "watchlist" | "ignore";
    let ruleTriggered: string | null = null;
    let confidence: number;
    let timeline: string;

    if (isOutdated) {
        verdict = "watchlist";
        ruleTriggered = "RULE 1: Freshness outdated → Watchlist (absolute)";
        confidence = 72;
        timeline = "re-evaluate in 3 months";
    } else if (isHighFriction && topic.toLowerCase().includes("zig")) {
        verdict = "ignore";
        ruleTriggered = "RULE 2: High friction + weak market → Ignore (absolute)";
        confidence = 85;
        timeline = "wait 6+ months";
    } else if (isLowFriction) {
        verdict = "pursue";
        ruleTriggered = "RULE 3: Low friction + strong market → Pursue (force)";
        confidence = 88;
        timeline = "now";
    } else {
        verdict = "explore";
        ruleTriggered = null;
        confidence = 65;
        timeline = "in 3 months";
    }


    // ... existing logic ...

    // Generate graph nodes and edge (mocked for demo)
    const { nodes, edges } = generateDemoGraph(verdict, topic);

    // Generate confidence history (mocked)
    const confidenceHistory = generateDemoConfidenceHistory(confidence);

    // Generate memory matches (mocked)
    const memoryMatches = generateDemoMemoryMatches(topic);

    return {
        verdict,
        confidence,
        timeline,
        ruleTriggered,
        reasoning: getReasoningForVerdict(verdict, topic),
        actionItems: getActionItemsForVerdict(verdict),
        // Add new fields for visualization
        reasoningGraph: { nodes, edges },
        confidenceHistory,
        memory_matches: memoryMatches,
        toolEvidence: {
            freshness: {
                isOutdated,
                reason: isOutdated
                    ? "Major release detected after model knowledge cutoff (April 2024)"
                    : "No major releases post-cutoff",
                modelCutoff: "April 2024",
                risk: isOutdated ? "high" : "low",
            },
            market: {
                adoption: isLowFriction ? "high" : isHighFriction ? "low" : "medium",
                hiringSignal: isLowFriction ? "strong" : isHighFriction ? "weak" : "moderate",
                ecosystem: isLowFriction ? "mature" : "growing",
                confidence: 0.8,
            },
            friction: {
                learningCurve: isLowFriction ? "gentle" : isHighFriction ? "steep" : "medium",
                infraCost: "low",
                operationalRisk: isHighFriction ? "medium" : "low",
                overallFriction: isLowFriction ? 0.2 : isHighFriction ? 0.75 : 0.5,
                userModifier: 0,
            },
        },
        ledger: {
            context_evidence: ["Backend developer profile", "Risk-tolerant mindset", "Focus on scalability"],
            market_signals: [
                { label: "Community Growth", score: 8 },
                { label: "Enterprise Adoption", score: 6 },
                { label: "Tooling Stability", score: 7 },
                { label: "Hiring Demand", score: 5 }
            ],
            trade_offs: {
                gains: ["Significant performance boost", "Better developer experience", "Modern ecosystem access"],
                costs: ["Legacy integration friction", "Initial learning overhead"]
            },
            decision_anchors: [
                "If ecosystem support drops < 2 major releases/year",
                "If hiring demand decreases in your region",
                "If technical debt exceeds 20% of dev time"
            ]
        }
    };
}

function getReasoningForVerdict(verdict: string, topic: string): string {
    switch (verdict) {
        case "pursue":
            return `${topic} shows strong market adoption limits and low friction for your experience level. The ecosystem is mature with good documentation and community support.`;
        case "explore":
            return `${topic} has potential but needs more investigation. The signals are mixed - some positive indicators balanced by unknowns regarding long-term maintenance.`;
        case "watchlist":
            return `Model knowledge about ${topic} may be outdated. There have been significant releases after the knowledge cutoff that require manual verification.`;
        case "ignore":
            return `${topic} has high adoption friction combined with weak market signals. The investment required doesn't justify the potential return at this stage.`;
        default:
            return "";
    }
}

// Helper to generate a graph structure
function generateDemoGraph(verdict: string, topic: string) {
    const nodes = [
        { id: 'start', label: topic, type: 'context', x: 50, y: 200 },
        { id: 'market', label: 'Market Analysis', type: 'tool', x: 200, y: 100 },
        { id: 'freshness', label: 'Freshness Check', type: 'tool', x: 200, y: 300 },
        { id: 'inference1', label: 'Strong Adoption', type: 'evidence', x: 400, y: 100 },
        { id: 'inference2', label: 'Recent Updates', type: 'evidence', x: 400, y: 300 },
        { id: 'synthesis', label: 'Synthesis', type: 'reasoning', x: 600, y: 200 },
        { id: 'verdict', label: verdict.toUpperCase(), type: 'verdict', x: 800, y: 200 },
    ];

    const edges = [
        { id: 'e1', source: 'start', target: 'market', label: 'analyzes' },
        { id: 'e2', source: 'start', target: 'freshness', label: 'checks' },
        { id: 'e3', source: 'market', target: 'inference1', label: 'identifies' },
        { id: 'e4', source: 'freshness', target: 'inference2', label: 'confirms' },
        { id: 'e5', source: 'inference1', target: 'synthesis', label: 'supports' },
        { id: 'e6', source: 'inference2', target: 'synthesis', label: 'supports' },
        { id: 'e7', source: 'synthesis', target: 'verdict', label: 'concludes' },
    ];

    return { nodes, edges };
}

// Helper to generate confidence history
function generateDemoConfidenceHistory(finalConfidence: number) {
    return [
        { step: 1, label: 'Initial', score: 0.5 },
        { step: 2, label: 'Market Check', score: 0.65 },
        { step: 3, label: 'Tech Analysis', score: 0.72 },
        { step: 4, label: 'Risk Assessment', score: finalConfidence / 100 },
    ];
}


// Helper to generate memory matches
function generateDemoMemoryMatches(topic: string) {
    return [
        {
            id: 'm1',
            text: `Previous decision on "${topic} alternatives"`,
            verdict: 'explore',
            date: '2 weeks ago',
            similarity: 0.85
        },
        {
            id: 'm2',
            text: `Analysis of "Backend best practices"`,
            verdict: 'pursue',
            date: '1 month ago',
            similarity: 0.65
        }
    ];
}

function getActionItemsForVerdict(verdict: string): string[] {
    switch (verdict) {
        case "pursue":
            return [
                "Start with official documentation or tutorials",
                "Build a small proof-of-concept project",
                "Track progress in your learning journal",
            ];
        case "explore":
            return [
                "Research current state and recent developments",
                "Find 2-3 real-world case studies",
                "Re-run decision analysis in 2 weeks",
            ];
        case "watchlist":
            return [
                "Research current version features and changes",
                "Check official documentation for recent updates",
                "Re-evaluate in 3 months with updated information",
            ];
        case "ignore":
            return [
                "Focus on lower-friction alternatives",
                "Re-evaluate if market adoption increases significantly",
                "Check back in 6+ months",
            ];
        default:
            return [];
    }
}

