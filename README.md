# Bunjang Mastra Agent

`pinion05/bunjangcli`를 재활용한 번개장터 Mastra 검색 에이전트 MVP.

## 구성

- Mastra `Agent` + `createTool`
- `bunjang-cli` subprocess wrapper
- `@mastra/memory` + `@mastra/libsql` local memory
- read-only 검색/랭킹만 수행

## 실행

```bash
pnpm install
set -a; . ./.env.local; set +a
pnpm mastra:dev
```

브라우저:

```text
http://localhost:4111
```

## Mastra LLM 모드

기본 실행 경로는 Mastra Studio다. OpenAI 키가 있으면 아래처럼 실행한다.

```bash
export OPENAI_API_KEY=...
export MASTRA_MODEL=openai/gpt-4o-mini
pnpm mastra:dev
```

OpenRouter도 지원한다. `MASTRA_MODEL`에는 OpenRouter 모델 ID를 그대로 지정한다.

```bash
export OPENROUTER_API_KEY=...
export MASTRA_MODEL=deepseek/deepseek-v4-flash
pnpm mastra:dev
```

## Mastra 대시보드에서 직접 사용

Mastra Studio에서 에이전트를 직접 테스트할 수 있다.

### 1) 환경변수 준비

OpenRouter 키와 모델을 설정한다. 로컬에 `.env.local`이 있다면 zsh에 잡힌 다른 키보다 이 파일 값을 우선 쓰도록 `source`해서 실행한다.

```bash
# .env.local 예시
OPENROUTER_API_KEY=...
MASTRA_MODEL=deepseek/deepseek-v4-flash
```

### 2) Mastra Studio 실행

```bash
set -a; . ./.env.local; set +a
pnpm mastra:dev
```

실행 후 브라우저에서 연다.

```text
http://localhost:4111
```

API/Swagger 문서는 아래에서 확인할 수 있다.

```text
http://localhost:4111/swagger-ui
```

### 3) Studio에서 에이전트 사용

1. Studio에서 `Bunjang Search Agent`를 선택한다.
2. 채팅창에 자연어로 입력한다.

예시:

```text
아이폰 16 찾아줘
내 예산은 80만원이야. 아이폰 16 찾아줘
방금 말한 예산 기억해서 다시 추천해줘
```

에이전트는 반드시 `bunjang-search` tool을 호출해 실제 번개장터 매물을 수집한 뒤 답한다. 모델 지식만으로 “아직 출시 전” 같은 답변을 하지 않도록 지시되어 있다.

### 4) 메모리

Mastra Studio는 thread/resource를 자동으로 생성한다. 이 프로젝트는 `@mastra/memory` + `@mastra/libsql`로 메모리를 켜두었기 때문에 같은 대화 안에서 예산/선호 조건을 기억한다.

로컬 메모리 DB는 아래 파일에 저장되며 git에는 포함하지 않는다.

```text
mastra-memory.db*
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
