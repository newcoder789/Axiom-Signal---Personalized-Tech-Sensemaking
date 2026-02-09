import { z } from 'zod';

export const ThoughtSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10,000 characters'),
  context: z.object({
    riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
    timeHorizon: z.string().optional(),
    experienceLevel: z.string().optional(),
  }).optional(),
});

export const FeedbackSchema = z.object({
  type: z.enum(['agree', 'too_optimistic', 'too_conservative', 'wrong_assumption', 'missing_context']),
  note: z.string().max(1000).optional(),
});

export const JournalSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    icon: z.string().max(50).optional(),
});
