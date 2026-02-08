import { db } from './db';
import { thoughts } from './schema';
import { eq, and, or, like, desc } from 'drizzle-orm';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export interface AxiomAnalysis {
    verdict: 'pursue' | 'explore' | 'watchlist' | 'ignore' | 'archive';
    confidence: number;
    reasoning: string;
    timeline?: string;
    actionItems: Array<{ text: string; completed: boolean }>;
    reasonCodes: string[];
    toolEvidence: {
        freshness?: any;
        market?: any;
        friction?: any;
    };
    sources: Array<{
        title: string;
        url: string;
        snippet: string;
        domain: string;
        date: string;
        relevance: number;
    }>;
    coherenceScore: number;
    relevanceScore: number;
}

/**
 * Analyze a decision using the Axiom backend pipeline
 * Falls back to demo data if backend is unavailable
 */
export async function analyzeWithAxiom(data: {
    topic: string;
    content: string;
    context?: any;
}): Promise<AxiomAnalysis> {
    try {
        // Find similar past thoughts for memory context
        const similarThoughts = await findSimilarThoughts(data.topic, data.content);
        const memoryRelevance = calculateMemoryRelevance(similarThoughts);

        // Call Python Axiom backend
        const response = await fetch(`${BACKEND_URL}/api/verdict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: data.topic,
                user_profile: data.context?.userProfile || 'Developer',
                context: {
                    ...data.context,
                    similarDecisions: similarThoughts.length,
                    memoryRelevance,
                },
            }),
            // Timeout after 10 seconds
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn('Axiom backend returned error, using fallback');
            return getFallbackAnalysis(data, similarThoughts, memoryRelevance);
        }

        const backendResult = await response.json();

        // Transform backend response to our format
        return {
            verdict: mapVerdictFromBackend(backendResult.verdict),
            confidence: backendResult.confidence || 0.65,
            reasoning: backendResult.reasoning || backendResult.future_advice,
            timeline: backendResult.timeline || estimateTimeline(backendResult.confidence),
            actionItems: parseActionItems(backendResult.future_advice),
            reasonCodes: backendResult.reasonCodes || ['BACKEND_ANALYSIS'],
            toolEvidence: backendResult.toolEvidence || {},
            sources: backendResult.sources || [],
            coherenceScore: backendResult.coherence_score || 0.7,
            relevanceScore: memoryRelevance,
        };

    } catch (error) {
        console.error('Axiom backend error:', error);
        // Fallback to demo analysis
        const similarThoughts = await findSimilarThoughts(data.topic, data.content);
        const memoryRelevance = calculateMemoryRelevance(similarThoughts);
        return getFallbackAnalysis(data, similarThoughts, memoryRelevance);
    }
}

/**
 * Find similar thoughts in the database for memory context
 */
async function findSimilarThoughts(topic: string, content: string) {
    try {
        // Simple similarity search using LIKE
        // TODO: Upgrade to vector similarity when Redis integration is added
        const searchTerms = topic.toLowerCase().split(' ').filter(t => t.length > 3);

        if (searchTerms.length === 0) {
            return [];
        }

        const conditions = searchTerms.map(term =>
            or(
                like(thoughts.title, `%${term}%`),
                like(thoughts.content, `%${term}%`)
            )
        );

        return await db.select()
            .from(thoughts)
            .where(
                and(
                    or(...conditions),
                    eq(thoughts.isCurrent, true)
                )
            )
            .orderBy(desc(thoughts.createdAt))
            .limit(5);
    } catch (error) {
        console.error('Error finding similar thoughts:', error);
        return [];
    }
}

/**
 * Calculate memory relevance score based on similar past thoughts
 */
function calculateMemoryRelevance(similarThoughts: any[]): number {
    if (similarThoughts.length === 0) return 0;

    // Calculate based on recency and count
    const now = Date.now();
    const recentThoughts = similarThoughts.filter(t => {
        const age = now - new Date(t.createdAt).getTime();
        return age < 30 * 24 * 60 * 60 * 1000; // 30 days
    });

    // Score: 0.2 per recent thought, max 1.0
    return Math.min(1, recentThoughts.length * 0.2);
}

/**
 * Fallback analysis when backend is unavailable
 */
function getFallbackAnalysis(
    data: { topic: string; content: string; context?: any },
    similarThoughts: any[],
    memoryRelevance: number
): AxiomAnalysis {
    // Simple heuristic-based analysis
    const topic = data.topic.toLowerCase();
    const content = data.content.toLowerCase();

    let verdict: AxiomAnalysis['verdict'];
    let confidence: number;
    let reasoning: string;

    // Heuristic rules
    if (topic.includes('learn') || topic.includes('study')) {
        verdict = 'explore';
        confidence = 0.68;
        reasoning = `Learning ${data.topic} could be valuable. Consider your current skill gaps and career goals before committing significant time.`;
    } else if (topic.includes('build') || topic.includes('create')) {
        verdict = 'pursue';
        confidence = 0.75;
        reasoning = `Building projects is an excellent way to learn and demonstrate skills. Start with a small scope and iterate.`;
    } else if (content.includes('not sure') || content.includes('uncertain')) {
        verdict = 'explore';
        confidence = 0.55;
        reasoning = `More research needed. Gather additional information before making a commitment.`;
    } else {
        verdict = 'explore';
        confidence = 0.60;
        reasoning = `Based on the information provided, this warrants further investigation to determine fit and priority.`;
    }

    // Adjust for memory context
    if (similarThoughts.length > 0) {
        reasoning += ` You've explored ${similarThoughts.length} similar topic(s) recently.`;
        confidence = Math.min(0.95, confidence + (memoryRelevance * 0.1));
    }

    return {
        verdict,
        confidence,
        reasoning,
        timeline: estimateTimeline(confidence),
        actionItems: [
            { text: 'Research current state and trends', completed: false },
            { text: 'Identify 2-3 practical applications', completed: false },
            { text: 'Assess time commitment required', completed: false },
        ],
        reasonCodes: confidence > 0.7 ? ['HIGH_POTENTIAL'] : ['NEEDS_RESEARCH'],
        toolEvidence: {
            freshness: {
                note: 'Backend unavailable - using fallback analysis',
            },
        },
        sources: [],
        coherenceScore: confidence,
        relevanceScore: memoryRelevance,
    };
}

/**
 * Map backend verdict to our schema
 */
function mapVerdictFromBackend(backendVerdict: string): AxiomAnalysis['verdict'] {
    const normalized = backendVerdict?.toLowerCase();
    if (['pursue', 'explore', 'watchlist', 'ignore', 'archive'].includes(normalized)) {
        return normalized as AxiomAnalysis['verdict'];
    }
    return 'explore'; // Default
}

/**
 * Estimate timeline based on confidence
 */
function estimateTimeline(confidence: number): string {
    if (confidence > 0.75) return 'Now';
    if (confidence > 0.60) return '3 months';
    return '6+ months';
}

/**
 * Parse action items from advice text
 */
function parseActionItems(adviceText: string): Array<{ text: string; completed: boolean }> {
    if (!adviceText) {
        return [
            { text: 'Review the analysis', completed: false },
            { text: 'Gather more information', completed: false },
        ];
    }

    // Try to extract bullet points or numbered lists
    const lines = adviceText.split(/[.\n]/).filter(line => line.trim().length > 10);

    if (lines.length === 0) {
        return [{ text: adviceText.slice(0, 100), completed: false }];
    }

    return lines.slice(0, 5).map(line => ({
        text: line.trim().replace(/^[-*\d.)\s]+/, ''),
        completed: false,
    }));
}
