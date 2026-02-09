import { Thought } from '@/lib/schema';

export interface GraphNode {
    id: string;
    label: string;
    type: 'verdict' | 'evidence' | 'reasoning' | 'context' | 'tool' | 'source';
    data?: any;
    confidence?: number;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'supports' | 'contradicts' | 'leads_to' | 'sourced_from';
}

export interface ReasoningGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export function generateReasoningGraph(thought: Thought): ReasoningGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 1. Central Verdict Node
    const verdictId = `verdict-${thought.id}`;
    nodes.push({
        id: verdictId,
        label: thought.verdict ? thought.verdict.toUpperCase() : 'ANALYSIS',
        type: 'verdict',
        confidence: Number(thought.confidence || 0),
        data: {
            title: thought.title,
            timeline: thought.timeline
        }
    });

    // 2. Context Nodes (from inputs)
    if (thought.context) {
        const ctx = thought.context as Record<string, any>;
        if (ctx.profile) {
            nodes.push({ id: 'ctx-profile', label: ctx.profile, type: 'context' });
            edges.push({ id: 'e-profile', source: 'ctx-profile', target: verdictId, type: 'leads_to', label: 'perspective' });
        }
        if (ctx.riskTolerance) {
            nodes.push({ id: 'ctx-risk', label: `Risk: ${ctx.riskTolerance}`, type: 'context' });
            edges.push({ id: 'e-risk', source: 'ctx-risk', target: verdictId, type: 'leads_to', label: 'constraint' });
        }
    }

    // 3. Reasoning "Path" (Simulated from reasoning text for now)
    // In a real implementation, we'd parse the LLM's chain-of-thought or use stored reasoningNodes
    if (thought.reasoning) {
        const reasoningSentences = thought.reasoning.split('. ').filter(s => s.length > 20).slice(0, 3);

        reasoningSentences.forEach((sentence, idx) => {
            const nodeId = `reasoning-${idx}`;
            nodes.push({
                id: nodeId,
                label: sentence.substring(0, 50) + '...',
                type: 'reasoning',
                data: { fullText: sentence }
            });

            // Chain them: Context -> R1 -> R2 -> Verdict
            if (idx === 0) {
                // Connect to context if available, else just start
                if (nodes.find(n => n.type === 'context')) {
                    nodes.filter(n => n.type === 'context').forEach(n => {
                        edges.push({ id: `e-ctx-${n.id}-${nodeId}`, source: n.id, target: nodeId, type: 'leads_to' });
                    });
                }
            } else {
                edges.push({ id: `e-r${idx - 1}-r${idx}`, source: `reasoning-${idx - 1}`, target: nodeId, type: 'leads_to' });
            }

            // Connect last reasoning to verdict
            if (idx === reasoningSentences.length - 1) {
                edges.push({ id: `e-r${idx}-verdict`, source: nodeId, target: verdictId, type: 'leads_to', label: 'concludes' });
            }
        });
    }

    // 4. Evidence/Tool Nodes
    if (thought.toolEvidence) {
        const evidence = thought.toolEvidence as Record<string, any>;
        Object.entries(evidence).forEach(([tool, data], i) => {
            const nodeId = `tool-${i}`;
            const label = formatToolLabel(tool);

            nodes.push({
                id: nodeId,
                label: label,
                type: 'tool',
                data: data
            });

            // Connect to Verdict or Reasoning?
            // Connect to Verdict for now as "Support"
            edges.push({ id: `e-tool-${i}`, source: nodeId, target: verdictId, type: 'supports', label: 'evidence' });
        });
    }

    // 5. Sources
    if (thought.sources) {
        // Limit to top 3 sources to avoid clutter
        (thought.sources as any[]).slice(0, 3).forEach((source, i) => {
            const nodeId = `source-${i}`;
            nodes.push({
                id: nodeId,
                label: source.domain || source.title || 'Source',
                type: 'source',
                data: { url: source.url }
            });

            // Connect to tool nodes if possible, or straight to verdict
            // For simplicity, connect to verdict or random tool
            edges.push({ id: `e-source-${i}`, source: nodeId, target: verdictId, type: 'sourced_from' });
        });
    }

    return { nodes, edges };
}

function formatToolLabel(toolName: string): string {
    return toolName
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
