import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { Memory } from "@mastra/memory";
import { z } from "zod";
import { searchBunjangListings } from "@/lib/bunjang/cli";
import type { BunjangSearchRequest, BunjangSearchResponse } from "@/lib/bunjang/types";
import { BunjangSearchResponseSchema } from "@/lib/bunjang/types";
import { bunjangSearchTool } from "../tools/bunjang-search-tool";

const DEFAULT_OPENAI_MODEL = "openai/gpt-4o-mini";
const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function configuredModelId(): string {
  return process.env.MASTRA_MODEL ?? (process.env.OPENROUTER_API_KEY ? DEFAULT_OPENROUTER_MODEL : DEFAULT_OPENAI_MODEL);
}

function resolveMastraModel(): MastraModelConfig {
  const modelId = configuredModelId();

  if (process.env.OPENROUTER_API_KEY && !modelId.startsWith("openai/")) {
    return {
      providerId: "openrouter",
      modelId,
      url: process.env.OPENROUTER_BASE_URL ?? OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
    };
  }

  return modelId;
}

function hasLlmCredentials(): boolean {
  const modelId = configuredModelId();

  if (process.env.OPENROUTER_API_KEY && !modelId.startsWith("openai/")) return true;
  if (modelId.startsWith("openai/")) return Boolean(process.env.OPENAI_API_KEY);

  const providerId = modelId.split("/")[0];
  const providerEnvKey = `${providerId.toUpperCase().replaceAll("-", "_")}_API_KEY`;
  return Boolean(process.env[providerEnvKey]);
}

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
  instructions: `너는 번개장터 검색 에이전트다. 현재 날짜는 2026-06-10이다.
- 사용자가 상품/키워드를 말하면 첫 번째 행동은 반드시 bunjang-search tool 호출이다.
- 상품 출시 여부, 최신 시세, 번개장터 매물 존재 여부를 모델의 기억으로 판단하지 마라.
- "아이폰 16은 아직 출시되지 않았다"처럼 오래된 지식 기반 답변을 금지한다. 도구 결과가 있으면 도구 결과를 우선한다.
- tool 호출에 필요한 최소 입력은 query 하나다. 수집/추천 개수가 없으면 maxItems 24, finalCandidateCount 8, withDetail false로 호출한다.
- 광고, 매입글, 교환글, 부품/케이스/필름, 파손/하자 리스크를 보수적으로 표시한다.
- 최종 답변은 한국어, 짧게, 실제 매물 후보와 구매 판단 중심.
- read-only. 찜/채팅/구매 액션 금지.
- tool이 실패한 경우에만 실패 사실을 말하고, 임의 대체 상품 추천으로 넘어가지 마라.`,
  model: resolveMastraModel(),
  memory: new Memory({
    options: {
      lastMessages: 20,
      generateTitle: true,
    },
  }),
  tools: {
    bunjangSearch: bunjangSearchTool,
  },
});

export async function runBunjangSearchAgent(request: BunjangSearchRequest): Promise<BunjangSearchResponse> {
  const deterministic = await searchBunjangListings(request);

  if (!request.useLlm || !hasLlmCredentials()) return deterministic;

  const result = await bunjangSearchAgent
    .generate(
      `검색어: ${request.query}\n수집 ${request.maxItems}개, 최종 ${request.finalCandidateCount}개 추천해.`,
      {
        structuredOutput: {
          schema: AgentOutputSchema,
        },
        ...(request.threadId && request.resourceId
          ? {
              memory: {
                thread: request.threadId,
                resource: request.resourceId,
              },
            }
          : {}),
      },
    )
    .catch(() => null);

  if (!result) {
    return BunjangSearchResponseSchema.parse({
      ...deterministic,
      notes: [
        ...deterministic.notes,
        "Mastra LLM 보강 실패: provider 거절/한도/일시 오류로 deterministic 결과를 반환함",
      ],
    });
  }

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
