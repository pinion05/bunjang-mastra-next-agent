import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchBunjangListings } from "@/lib/bunjang/cli";
import { BunjangSearchRequestSchema, BunjangSearchResponseSchema } from "@/lib/bunjang/types";

const BunjangSearchToolInputSchema = z.object({
  query: z.string().trim().min(1, "검색어 필요"),
  maxItems: z.coerce.number().int().min(1).max(80).optional(),
  finalCandidateCount: z.coerce.number().int().min(1).max(20).optional(),
  withDetail: z.boolean().optional(),
});

export const bunjangSearchTool = createTool({
  id: "bunjang-search",
  description:
    "번개장터 공개 검색을 bunjang-cli로 실시간 수집하고, 광고/매입글/부품 리스크를 감점해 후보를 랭킹한다. 상품 출시 여부나 중고 시세를 모델 지식으로 추정하지 말고 이 도구 결과만 근거로 답한다. Read-only. 찜/채팅/구매 안 함.",
  inputSchema: BunjangSearchToolInputSchema,
  outputSchema: BunjangSearchResponseSchema,
  execute: async (input) => {
    const parsedInput = BunjangSearchToolInputSchema.parse(input);
    const parsed = BunjangSearchRequestSchema.parse({
      ...parsedInput,
      maxItems: parsedInput.maxItems ?? 24,
      finalCandidateCount: parsedInput.finalCandidateCount ?? 8,
      withDetail: parsedInput.withDetail ?? false,
      useLlm: false,
    });
    return searchBunjangListings(parsed);
  },
});
