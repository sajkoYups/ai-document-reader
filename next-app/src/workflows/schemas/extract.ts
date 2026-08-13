import { z } from "zod";

const evidenceIds = z.array(z.string()).default([]);

export const KeyFieldSchema = z.object({
  field: z.string(),
  value: z.string(),
  evidenceIds,
});

export const DateRowSchema = z.object({
  date: z.string(),
  event: z.string(),
  evidenceIds,
});

export const EntityRowSchema = z.object({
  entity: z.string(),
  type: z.string().default(""),
  role: z.string().default(""),
  evidenceIds,
});

export const AmountRowSchema = z.object({
  amount: z.string(),
  currency: z.string().default(""),
  meaning: z.string().default(""),
  evidenceIds,
});

export const ObligationRowSchema = z.object({
  party: z.string().default(""),
  obligation: z.string(),
  deadline: z.string().default("Not specified"),
  condition: z.string().default(""),
  evidenceIds,
});

export const RequirementRowSchema = z.object({
  requirement: z.string(),
  mandatory: z.string().default(""),
  deadline: z.string().default("Not specified"),
  evidenceIds,
});

export const ContactRowSchema = z.object({
  name: z.string(),
  role: z.string().default(""),
  contact: z.string().default(""),
  evidenceIds,
});

export const CustomRowSchema = z.object({
  item: z.string(),
  detail: z.string().default(""),
  evidenceIds,
});

export const ExtractResultSchema = z.object({
  title: z.string().optional(),
  keyFields: z.array(KeyFieldSchema).default([]),
  dates: z.array(DateRowSchema).default([]),
  entities: z.array(EntityRowSchema).default([]),
  amounts: z.array(AmountRowSchema).default([]),
  obligations: z.array(ObligationRowSchema).default([]),
  requirements: z.array(RequirementRowSchema).default([]),
  contacts: z.array(ContactRowSchema).default([]),
  customRows: z.array(CustomRowSchema).default([]),
});

export type ExtractResult = z.infer<typeof ExtractResultSchema>;
