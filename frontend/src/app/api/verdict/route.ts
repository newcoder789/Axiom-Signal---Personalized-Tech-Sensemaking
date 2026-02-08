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

    return {
        verdict,
        confidence,
        timeline,
        ruleTriggered,
        reasoning: getReasoningForVerdict(verdict, topic),
        actionItems: getActionItemsForVerdict(verdict),
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
    };
}

function getReasoningForVerdict(verdict: string, topic: string): string {
    switch (verdict) {
        case "pursue":
            return `${topic} shows strong market adoption and low friction for your experience level. The ecosystem is mature with good documentation and community support.`;
        case "explore":
            return `${topic} has potential but needs more investigation. The signals are mixed - some positive indicators balanced by unknowns.`;
        case "watchlist":
            return `Model knowledge about ${topic} may be outdated. There have been significant releases after the knowledge cutoff.`;
        case "ignore":
            return `${topic} has high adoption friction combined with weak market signals. The investment required doesn't justify the potential return.`;
        default:
            return "";
    }
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
