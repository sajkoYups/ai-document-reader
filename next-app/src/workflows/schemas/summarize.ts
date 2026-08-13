import { z } from "zod";
import { CitedItemSchema } from "./evidence";

export const SummaryResultSchema = z.object({
  overview: z.string().default(""),
  keyPoints: z.array(CitedItemSchema).default([]),
  numbers: z.array(CitedItemSchema).default([]),
  peopleOrgs: z.array(CitedItemSchema).default([]),
  dates: z.array(CitedItemSchema).default([]),
  attention: z.array(CitedItemSchema).default([]),
});

export type SummaryResult = z.infer<typeof SummaryResultSchema>;
