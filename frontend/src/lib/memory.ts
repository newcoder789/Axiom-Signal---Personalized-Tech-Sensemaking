// import { ActionItem } from "./types";

import { API_BASE_URL } from './config';

const BACKEND_URL = API_BASE_URL;

export interface MemoryMatch {
    id: string;
    type: "decision" | "pattern";
    text: string;
    verdict: string;
    confidence: number;
    relative_time?: string;
    similarity?: number;
}

export interface MemorySearchResponse {
    query: string;
    matches: MemoryMatch[];
    status: string;
}

export interface DecisionPatterns {
    user_id: string;
    traits: any[];
    verdict_distribution: Record<string, number>;
    total_decisions: number;
    strongest_trait?: {
        trait_type: string;
        description: string;
        confidence: number;
    };
}

export const memoryService = {
    /**
     * Live search for similar memories as the user types
     */
    async search(query: string, userProfile: string = "Developer"): Promise<MemoryMatch[]> {
        if (!query || query.length < 3) return [];

        try {
            const response = await fetch(`${BACKEND_URL}/api/memory/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, user_profile: userProfile }),
            });

            if (!response.ok) throw new Error("Memory search failed");

            const data: MemorySearchResponse = await response.json();
            return data.matches || [];
        } catch (error) {
            console.error("Memory search error:", error);
            return [];
        }
    },

    /**
     * Get user's decision patterns
     */
    async getPatterns(userProfile: string = "Developer"): Promise<DecisionPatterns | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/memory/patterns`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_profile: userProfile }),
            });

            if (!response.ok) throw new Error("Pattern fetch failed");

            const result = await response.json();
            return result.data || null;
        } catch (error) {
            console.error("Pattern fetch error:", error);
            return null;
        }
    }
};
