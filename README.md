# Bunjang Mastra Next Agent

`pinion05/bunjangcli`를 재활용한 번개장터 검색 에이전트 MVP.

## 구성

- Next.js App Router UI
- `/api/search` Route Handler
- Mastra `Agent` + `createTool`
- `bunjang-cli` subprocess wrapper
- read-only 검색/랭킹만 수행

## 실행

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

브라우저:

```text
http://localhost:3000
```

## API

```bash
curl -s http://localhost:3000/api/search \
  -H 'content-type: application/json' \
  -d '{"query":"아이폰 15 프로","maxItems":12,"finalCandidateCount":5}' | jq
```

## Mastra LLM 모드

기본은 deterministic 랭킹이다. OpenAI 키가 있으면 UI에서 `Mastra LLM` 체크 후 실행 가능.

```bash
export OPENAI_API_KEY=...
export MASTRA_MODEL=openai/gpt-4o-mini
pnpm dev
```

## 재활용 지점

- dependency: `bunjang-cli: ^0.2.1` (published from `pinion05/bunjangcli`)
- CLI 호출: `src/lib/bunjang/cli.ts`
- 매물 정규화/스코어링: `src/lib/bunjang/normalize.ts`
- Mastra tool: `src/mastra/tools/bunjang-search-tool.ts`
- Mastra agent: `src/mastra/agents/bunjang-agent.ts`

## 안전 범위

- 검색만 함
- 찜/채팅/구매 안 함
- 광고/매입글/교환글/부품/하자 키워드 감점
- 가격은 `raw.text` 첫 `원` 표기를 우선 사용
