import { TASK_CONFIG, TaskItem } from './TaskConfig';

class TaskService {
    public tasks = TASK_CONFIG;
    private taskHistory: Map<string, any[]> = new Map();
    private userContext: Map<string, Record<string, any>> = new Map();

    async executeTask(taskId: string, userId = 'default', manualContext: Record<string, any> = {}) {
        const task = this.tasks[taskId];
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        let context = await this.getContextForTask(userId, task);

        // Merge manual context (e.g. live editor content)
        context = { ...context, ...manualContext };

        // Validate context - backend will handle missing fields but we ensure basic structure
        for (const requirement of task.requires) {
            if (context[requirement] === undefined) {
                context[requirement] = null;
            }
        }

        try {
            const startTime = Date.now();

            const response = await fetch(task.endpoint, {
                method: task.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    action: task.action,
                    userId,
                    context,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            const duration = Date.now() - startTime;

            this.recordTaskExecution(userId, taskId, {
                success: true,
                duration,
                timestamp: Date.now(),
                result
            });

            return result;
        } catch (error: any) {
            console.error(`Task ${taskId} failed:`, error);

            this.recordTaskExecution(userId, taskId, {
                success: false,
                error: error.message,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    async getContextForTask(userId: string, task: TaskItem) {
        const context: Record<string, any> = {};

        if (!this.userContext.has(userId)) {
            this.userContext.set(userId, {});
        }
        const userCache = this.userContext.get(userId)!;

        for (const requirement of task.requires) {
            if (userCache[requirement] && (Date.now() - userCache[requirement].timestamp < this.getTTLForRequirement(requirement))) {
                context[requirement] = userCache[requirement].value;
            } else {
                const value = await this.fetchContext(requirement, userId);
                userCache[requirement] = {
                    value,
                    timestamp: Date.now()
                };
                context[requirement] = value;
            }
        }

        return context;
    }

    async fetchContext(requirement: string, userId: string) {
        const { API_BASE_URL } = await import('../config');
        const baseUrl = `${API_BASE_URL}/api`;
        try {
            switch (requirement) {
                case 'selectedEntry':
                case 'latestEntry':
                    const resLatest = await fetch(`${baseUrl}/thoughts/latest?user_id=${userId}`);
                    if (resLatest.ok) {
                        const data = await resLatest.json();
                        return data.content || '';
                    }
                    return '';
                case 'todayEntries':
                    return { since: new Date().setHours(0, 0, 0, 0) };
                case 'pendingItems':
                    return {};
                case 'timeRange':
                    return { start: new Date().setHours(0, 0, 0, 0), end: Date.now() };
                case 'context':
                    return { limit: 10 };
                default:
                    return null;
            }
        } catch (e) {
            console.error("Failed to fetch context:", requirement, e);
            return null;
        }
    }

    getTTLForRequirement(requirement: string) {
        const ttlMap: Record<string, number> = {
            'selectedEntry': 30000,
            'latestEntry': 60000,
            'todayEntries': 300000,
            'pendingItems': 60000,
            'timeRange': 60000,
            'context': 30000
        };
        return ttlMap[requirement] || 30000;
    }

    recordTaskExecution(userId: string, taskId: string, data: any) {
        if (!this.taskHistory.has(userId)) {
            this.taskHistory.set(userId, []);
        }

        const history = this.taskHistory.get(userId)!;
        history.push({
            taskId,
            ...data,
            timestamp: Date.now()
        });

        if (history.length > 100) {
            history.shift();
        }
    }

    getTaskHistory(userId: string, limit = 20) {
        if (!this.taskHistory.has(userId)) return [];
        return [...this.taskHistory.get(userId)!].reverse().slice(0, limit);
    }

    getAvailableTasks() {
        return Object.values(this.tasks)
            .sort((a, b) => a.priority - b.priority);
    }

    getTaskCategories() {
        const categories = new Set<string>();
        Object.values(this.tasks).forEach(task => {
            categories.add(task.category);
        });
        return Array.from(categories);
    }
}

const taskService = new TaskService();
export default taskService;
