export interface TaskItem {
    id: string;
    endpoint: string;
    method: string;
    requires: string[];
    action: string;
    buttonText: string;
    description: string;
    icon: string;
    category: 'analysis' | 'extraction' | 'quick' | 'decision';
    priority: number;
}

export const TASK_CONFIG: Record<string, TaskItem> = {
    'analyze': {
        id: 'analyze',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['selectedEntry'],
        action: 'analyze',
        buttonText: 'Analyze',
        description: 'Analyze selected entry',
        icon: '🔍',
        category: 'analysis',
        priority: 1
    },
    'summarize': {
        id: 'summarize',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['timeRange'],
        action: 'summarize',
        buttonText: 'Summarize',
        description: 'Summarize time period',
        icon: '📋',
        category: 'analysis',
        priority: 2
    },
    'extract-actions': {
        id: 'extract-actions',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['selectedEntry'],
        action: 'extract-actions',
        buttonText: 'Extract Actions',
        description: 'Extract actionable items',
        icon: '✅',
        category: 'extraction',
        priority: 3
    },
    'find-contradictions': {
        id: 'find-contradictions',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['context'],
        action: 'find-contradictions',
        buttonText: 'Find Contradictions',
        description: 'Find conflicting entries',
        icon: '⚖️',
        category: 'analysis',
        priority: 4
    },
    'quick-advice': {
        id: 'quick-advice',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['latestEntry'],
        action: 'quick-advice',
        buttonText: 'Quick Advice',
        description: 'Get advice on latest entry',
        icon: '💡',
        category: 'quick',
        priority: 5
    },
    'daily-review': {
        id: 'daily-review',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['todayEntries'],
        action: 'daily-review',
        buttonText: 'Daily Review',
        description: 'Review today\'s activities',
        icon: '📅',
        category: 'quick',
        priority: 6
    },
    'decide-now': {
        id: 'decide-now',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['pendingItems'],
        action: 'decide-now',
        buttonText: 'Decide Now',
        description: 'Make decisions on pending items',
        icon: '🎯',
        category: 'decision',
        priority: 7
    },
    'extract-tasks': {
        id: 'extract-tasks',
        endpoint: 'http://localhost:8000/api/agent/task',
        method: 'POST',
        requires: ['selectedEntry'],
        action: 'extract-tasks',
        buttonText: 'Extract Tasks',
        description: 'Extract tasks from entry',
        icon: '📝',
        category: 'extraction',
        priority: 8
    }
};
