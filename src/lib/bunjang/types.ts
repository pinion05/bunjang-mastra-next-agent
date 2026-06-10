import { z } from "zod";

export const BunjangSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "검색어 필요"),
  maxItems: z.coerce.number().int().min(1).max(80).default(24),
  finalCandidateCount: z.coerce.number().int().min(1).max(20).default(8),
  withDetail: z.boolean().default(false),
  useLlm: z.boolean().default(false),
});

export type BunjangSearchRequest = z.infer<typeof BunjangSearchRequestSchema>;

export const BunjangListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  price: z.number().nullable(),
  currency: z.string().default("KRW"),
  imageUrl: z.string().url().nullable().optional(),
  location: z.string().nullable().optional(),
  transportUsed: z.string().optional(),
  rawText: z.string().optional(),
  detailText: z.string().optional(),
  sourcePage: z.number().nullable().optional(),
  riskFlags: z.array(z.string()).default([]),
  score: z.number().default(0),
  reason: z.string().default(""),
});

export type BunjangListing = z.infer<typeof BunjangListingSchema>;

export const BunjangSearchResponseSchema = z.object({
  mode: z.enum(["deterministic", "mastra-llm"]),
  query: z.string(),
  collectedCount: z.number(),
  recommended: z.array(BunjangListingSchema),
  allListings: z.array(BunjangListingSchema),
  notes: z.array(z.string()).default([]),
});

export type BunjangSearchResponse = z.infer<typeof BunjangSearchResponseSchema>;
