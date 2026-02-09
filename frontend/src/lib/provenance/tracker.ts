import { db } from '@/lib/db';
import { toolExecutionTraces } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export interface ToolExecutionLog {
    thoughtId?: string;
    toolName: string;
    executionOrder: number;
    inputData?: any;
    outputData: any;
    executionTimeMs?: number;
    success?: boolean;
    errorMessage?: string;
    inputConfidence?: number;
    outputConfidence?: number;
}

export async function logToolExecution(log: ToolExecutionLog) {
    try {
        await db.insert(toolExecutionTraces).values({
            thoughtId: log.thoughtId,
            toolName: log.toolName,
            executionOrder: log.executionOrder,
            inputData: log.inputData,
            outputData: log.outputData,
            executionTimeMs: log.executionTimeMs,
            success: log.success ?? true,
            errorMessage: log.errorMessage,
            inputConfidence: log.inputConfidence ? String(log.inputConfidence) : null,
            outputConfidence: log.outputConfidence ? String(log.outputConfidence) : null,
        });
    } catch (error) {
        console.error('Failed to log tool execution', error);
        // Don't throw, just log error so main flow isn't interrupted
    }
}

export async function getProvenance(thoughtId: string) {
    try {
        const traces = await db.select()
            .from(toolExecutionTraces)
            .where(eq(toolExecutionTraces.thoughtId, thoughtId))
            .orderBy(desc(toolExecutionTraces.executionOrder));

        return traces;
    } catch (error) {
        console.error('Failed to get provenance', error);
        return [];
    }
}

export async function traceConfidenceFlow(thoughtId: string) {
    // Return sequence of confidence changes
    const traces = await getProvenance(thoughtId);
    return traces.map(t => ({
        tool: t.toolName,
        confidence: Number(t.outputConfidence || 0),
        timestamp: t.createdAt
    })).reverse(); // Chronological
}
