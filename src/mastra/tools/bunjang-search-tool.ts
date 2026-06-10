import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchBunjangListings } from "@/lib/bunjang/cli";
import { BunjangSearchRequestSchema, BunjangSearchResponseSchema } from "@/lib/bunjang/types";

export const bunjangSearchTool = createTool({
  id: "bunjang-search",
  description:
    "번개장터 공개 검색을 bunjang-cli로 수집하고, 광고/매입글/부품 리스크를 감점해 후보를 랭킹한다. Read-only. 찜/채팅/구매 안 함.",
  inputSchema: BunjangSearchRequestSchema.omit({ useLlm: true }).extend({
    maxItems: z.number().int().min(1).max(80).default(24),
    finalCandidateCount: z.number().int().min(1).max(20).default(8),
  }),
  outputSchema: BunjangSearchResponseSchema,
  execute: async (input) => {
    const parsed = BunjangSearchRequestSchema.parse({ ...input, useLlm: false });
    return searchBunjangListings(parsed);
  },
});
