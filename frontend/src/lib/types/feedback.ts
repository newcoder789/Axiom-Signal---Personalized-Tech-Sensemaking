
export interface Feedback {
    id: string;
    thoughtId: string;
    userId: string;

    // Tags (multiple can be true)
    tags: {
        isTooOptimistic: boolean;
        isTooConservative: boolean;
        hasWrongAssumption: boolean;
        missingContext: boolean;
        isCorrect: boolean;
    };

    // Corrections (optional - user can suggest)
    corrections?: {
        verdict?: 'pursue' | 'explore' | 'watchlist' | 'ignore';
        confidence?: number;
        timeline?: string;
        reasoning?: string;
    };

    comment?: string;
    confidenceAdjustment: number; // How much to adjust future analyses
    usedInTraining: boolean;
    createdAt: Date;
}

export interface FeedbackRequest {
    thoughtId: string;
    tags: {
        isTooOptimistic?: boolean;
        isTooConservative?: boolean;
        hasWrongAssumption?: boolean;
        missingContext?: boolean;
        isCorrect?: boolean;
    };
    corrections?: {
        verdict?: 'pursue' | 'explore' | 'watchlist' | 'ignore';
        confidence?: number;
        timeline?: string;
    };
    comment?: string;
}

export interface FeedbackStats {
    totalFeedback: number;
    tagDistribution: Record<string, number>;
    accuracyTrend: number[]; // Last 10 feedback accuracy scores
    mostCommonIssues: string[];
    issueFrequency: Record<string, number>;
    averageAdjustment: string;
}
