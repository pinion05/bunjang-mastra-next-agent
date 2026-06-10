import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { searchBunjangListings } from "@/lib/bunjang/cli";
import type { BunjangSearchRequest, BunjangSearchResponse } from "@/lib/bunjang/types";
import { BunjangSearchResponseSchema } from "@/lib/bunjang/types";
import { bunjangSearchTool } from "../tools/bunjang-search-tool";

const AgentOutputSchema = z.object({
  summary: z.string(),
  picks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      reason: z.string(),
      risk: z.string(),
    }),
  ),
});

export const bunjangSearchAgent = new Agent({
  id: "bunjang-search-agent",
  name: "Bunjang Search Agent",
  description: "Mastra agent that turns a buyer intent into ranked Bunjang listing candidates.",
  instructions: `너는 번개장터 검색 에이전트다.
- 반드시 bunjang-search tool로 실제 매물을 수집한다.
- 광고, 매입글, 교환글, 부품/케이스/필름, 파손/하자 리스크를 보수적으로 표시한다.
- 최종 답변은 한국어, 짧게, 구매 판단 중심.
- read-only. 찜/채팅/구매 액션 금지.`,
  model: process.env.MASTRA_MODEL ?? "openai/gpt-4o-mini",
  tools: {
    bunjangSearch: bunjangSearchTool,
  },
});

export async function runBunjangSearchAgent(request: BunjangSearchRequest): Promise<BunjangSearchResponse> {
  const deterministic = await searchBunjangListings(request);

  if (!request.useLlm || !process.env.OPENAI_API_KEY) return deterministic;

  const result = await bunjangSearchAgent.generate(
    `검색어: ${request.query}\n수집 ${request.maxItems}개, 최종 ${request.finalCandidateCount}개 추천해.`,
    {
      structuredOutput: {
        schema: AgentOutputSchema,
      },
    },
  );

  const agentObject = result.object;
  const recommended = deterministic.recommended.map((item) => {
    const pick = agentObject.picks.find((candidate) => candidate.id === item.id);
    if (!pick) return item;
    return {
      ...item,
      reason: pick.reason,
      riskFlags: pick.risk ? [...new Set([...item.riskFlags, pick.risk])] : item.riskFlags,
    };
  });

  return BunjangSearchResponseSchema.parse({
    ...deterministic,
    mode: "mastra-llm",
    recommended,
    notes: [...deterministic.notes, agentObject.summary],
  });
}
