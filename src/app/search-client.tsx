"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Listing = {
  id: string;
  title: string;
  url?: string;
  price: number | null;
  imageUrl?: string | null;
  riskFlags: string[];
  score: number;
  reason: string;
  rawText?: string;
};

type SearchResponse = {
  mode: "deterministic" | "mastra-llm";
  query: string;
  collectedCount: number;
  recommended: Listing[];
  notes: string[];
};

type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      result?: SearchResponse;
      error?: string;
      pending?: boolean;
    };

const STARTER_PROMPTS = ["아이폰 15 프로 상태 좋은 것 찾아줘", "오클리 아이자켓 추천해줘", "맥북 에어 M2 저렴한 매물"];

function priceText(price: number | null) {
  return price ? `${price.toLocaleString("ko-KR")}원` : "가격 불명";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resultSummary(result: SearchResponse) {
  const mode = result.mode === "mastra-llm" ? "Mastra LLM" : "deterministic";
  return `${result.collectedCount}개를 살펴보고 ${result.recommended.length}개를 골랐어요. (${mode})`;
}

function ListingCard({ item, rank }: { item: Listing; rank: number }) {
  return (
    <article className="group overflow-hidden rounded-[1.7rem] border border-zinc-800 bg-zinc-950/80 shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:border-red-500/60">
      <div className="grid grid-cols-[112px_1fr] gap-0 sm:grid-cols-[148px_1fr]">
        <div className="relative min-h-36 bg-zinc-900">
          <div className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white shadow-lg">
            #{rank}
          </div>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full min-h-36 items-center justify-center text-xs text-zinc-500">no image</div>
          )}
        </div>

        <div className="grid gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-black leading-snug text-zinc-100 sm:text-base">{item.title}</h3>
            <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
              score {item.score}
            </span>
          </div>
          <p className="text-xl font-black tracking-tight text-red-300">{priceText(item.price)}</p>
          <p className="text-sm leading-relaxed text-zinc-400">{item.reason}</p>
          {item.riskFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.riskFlags.map((flag) => (
                <span key={flag} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">
                  {flag}
                </span>
              ))}
            </div>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="w-fit rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-red-400 hover:text-red-200"
            >
              매물 보기 →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function AssistantBubble({ message }: { message: Extract<ChatMessage, { role: "assistant" }> }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/15 text-sm font-black text-red-200">
        B
      </div>
      <div className="min-w-0 flex-1">
        <div className="max-w-4xl rounded-[2rem] rounded-tl-md border border-zinc-800 bg-zinc-900/85 p-4 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-zinc-100">{message.text}</p>
            {message.pending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-300" />
                검색 중
              </span>
            )}
          </div>

          {message.error && <p className="mt-3 rounded-2xl border border-red-900 bg-red-950/70 p-3 text-sm text-red-100">{message.error}</p>}

          {message.result && (
            <div className="mt-4 grid gap-4">
              {message.result.notes.length > 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-black/30 p-3 text-xs leading-relaxed text-zinc-400">
                  {message.result.notes.map((note) => (
                    <p key={note}>• {note}</p>
                  ))}
                </div>
              )}

              <div className="grid gap-3">
                {message.result.recommended.map((item, index) => (
                  <ListingCard key={item.id} item={item} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [maxItems, setMaxItems] = useState(24);
  const [finalCandidateCount, setFinalCandidateCount] = useState(8);
  const [withDetail, setWithDetail] = useState(false);
  const [useLlm, setUseLlm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "찾고 싶은 물건을 채팅처럼 말해줘요. 예: “아이폰 15 프로 상태 좋은 것 찾아줘”",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const memoryIdsRef = useRef<{ threadId: string; resourceId: string } | null>(null);

  function getMemoryIds() {
    memoryIdsRef.current ??= {
      threadId: `bunjang-chat-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      resourceId: "bunjang-next-ui",
    };
    return memoryIdsRef.current;
  }

  const subtitle = useMemo(() => {
    const lastResult = [...messages].reverse().find((message) => message.role === "assistant" && message.result);
    return lastResult?.role === "assistant" && lastResult.result ? resultSummary(lastResult.result) : "채팅으로 번개장터 매물을 검색하고 랭킹합니다";
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function runSearch(searchQuery: string) {
    const assistantId = makeId("assistant");
    setMessages((current) => [
      ...current,
      { id: makeId("user"), role: "user", text: searchQuery },
      { id: assistantId, role: "assistant", text: "번개장터에서 매물을 훑고 있어요.", pending: true },
    ]);
    setLoading(true);

    try {
      const memoryIds = getMemoryIds();
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          maxItems,
          finalCandidateCount,
          withDetail,
          useLlm,
          threadId: memoryIds.threadId,
          resourceId: memoryIds.resourceId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "검색 실패");

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                id: assistantId,
                role: "assistant",
                text: resultSummary(payload),
                result: payload,
              }
            : message,
        ),
      );
    } catch (caught) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                id: assistantId,
                role: "assistant",
                text: "검색 중 문제가 생겼어요.",
                error: caught instanceof Error ? caught.message : "검색 실패",
              }
            : message,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery || loading) return;
    setQuery("");
    await runSearch(searchQuery);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080506] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(239,68,68,0.20),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(113,113,122,0.20),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:42px_42px]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6">
        <header className="mb-4 flex flex-col gap-4 rounded-[2rem] border border-zinc-800 bg-zinc-950/60 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-400">Bunjang Chat Agent</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">번개장터 채팅 검색</h1>
            <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/30 px-3 py-2">
              <input checked={useLlm} type="checkbox" onChange={(event) => setUseLlm(event.target.checked)} />
              Mastra LLM
            </label>
            <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/30 px-3 py-2">
              <input checked={withDetail} type="checkbox" onChange={(event) => setWithDetail(event.target.checked)} />
              상세 수집
            </label>
            <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/30 px-3 py-2">
              수집
              <input
                className="w-12 bg-transparent text-right font-bold outline-none"
                type="number"
                min={1}
                max={80}
                value={maxItems}
                onChange={(event) => setMaxItems(Number(event.target.value))}
              />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-black/30 px-3 py-2">
              추천
              <input
                className="w-10 bg-transparent text-right font-bold outline-none"
                type="number"
                min={1}
                max={20}
                value={finalCandidateCount}
                onChange={(event) => setFinalCandidateCount(Number(event.target.value))}
              />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-hidden rounded-[2rem] border border-zinc-800 bg-black/30 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex h-[calc(100vh-15rem)] flex-col gap-5 overflow-y-auto p-4 sm:h-[calc(100vh-14rem)] sm:p-6">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-2xl rounded-[2rem] rounded-tr-md bg-red-500 px-5 py-3 font-bold text-white shadow-xl shadow-red-950/30">
                    {message.text}
                  </div>
                </div>
              ) : (
                <AssistantBubble key={message.id} message={message} />
              ),
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="sticky bottom-0 mt-4 rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {STARTER_PROMPTS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="shrink-0 rounded-full border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-300 hover:border-red-400 hover:text-red-200 disabled:opacity-50"
                disabled={loading}
                onClick={() => runSearch(starter)}
              >
                {starter}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-query">
              검색 요청
            </label>
            <textarea
              id="chat-query"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-[1.5rem] border border-zinc-800 bg-black/50 px-4 py-3 text-base outline-none ring-red-500/20 placeholder:text-zinc-600 focus:border-red-400 focus:ring-4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="찾고 싶은 매물을 말해보세요. 예: 아이폰 15 프로 배터리 좋은 것"
              rows={1}
            />
            <button
              className="h-12 rounded-[1.5rem] bg-red-500 px-5 font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
              disabled={loading || !query.trim()}
            >
              {loading ? "검색 중" : "전송"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
