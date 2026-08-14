import { z } from "zod";

export const TimelineEventSchema = z.object({
  date: z.string().default(""),
  label: z.string().default(""),
  description: z.string().default(""),
  documentId: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
});

export const TimelineResultSchema = z.object({
  overview: z.string().default(""),
  events: z.array(TimelineEventSchema).default([]),
});

export type TimelineResult = z.infer<typeof TimelineResultSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
