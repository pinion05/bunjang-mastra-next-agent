"use client";

import { FormEvent, useMemo, useState } from "react";

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

function priceText(price: number | null) {
  return price ? `${price.toLocaleString("ko-KR")}원` : "가격 불명";
}

export function SearchClient() {
  const [query, setQuery] = useState("아이폰 15 프로");
  const [maxItems, setMaxItems] = useState(24);
  const [finalCandidateCount, setFinalCandidateCount] = useState(8);
  const [withDetail, setWithDetail] = useState(false);
  const [useLlm, setUseLlm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  const subtitle = useMemo(() => {
    if (!result) return "bunjang-cli + Mastra + Next.js";
    return `${result.collectedCount}개 수집 · ${result.recommended.length}개 추천 · ${result.mode}`;
  }, [result]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, maxItems, finalCandidateCount, withDetail, useLlm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "검색 실패");
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "검색 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:py-12">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-red-400">Bunjang Search Agent</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">번개장터 검색 에이전트</h1>
              <p className="mt-3 text-zinc-400">{subtitle}</p>
            </div>
            <a
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-red-400 hover:text-red-300"
              href="https://github.com/pinion05/bunjangcli"
              target="_blank"
              rel="noreferrer"
            >
              bunjangcli source
            </a>
          </div>
        </header>

        <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl sm:p-6">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-zinc-300">검색어</span>
            <input
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-lg outline-none ring-red-500/30 focus:border-red-400 focus:ring-4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 아이폰 15 프로, 오클리 아이자켓"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">수집 개수</span>
              <input
                className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-400"
                type="number"
                min={1}
                max={80}
                value={maxItems}
                onChange={(event) => setMaxItems(Number(event.target.value))}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">추천 개수</span>
              <input
                className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-400"
                type="number"
                min={1}
                max={20}
                value={finalCandidateCount}
                onChange={(event) => setFinalCandidateCount(Number(event.target.value))}
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
              <input checked={withDetail} type="checkbox" onChange={(event) => setWithDetail(event.target.checked)} />
              상세 수집
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
              <input checked={useLlm} type="checkbox" onChange={(event) => setUseLlm(event.target.checked)} />
              Mastra LLM
            </label>
          </div>

          <button
            className="rounded-2xl bg-red-500 px-5 py-3 font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
            disabled={loading || !query.trim()}
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </form>

        {error && <p className="rounded-2xl border border-red-900 bg-red-950/70 p-4 text-red-200">{error}</p>}

        {result && (
          <section className="grid gap-4">
            {result.notes.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                {result.notes.map((note) => (
                  <p key={note}>- {note}</p>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.recommended.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl">
                  <div className="aspect-square bg-zinc-800">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-500">no image</div>
                    )}
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-2 font-bold">{item.title}</h2>
                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{item.score}</span>
                    </div>
                    <p className="text-xl font-black text-red-300">{priceText(item.price)}</p>
                    <p className="text-sm text-zinc-400">{item.reason}</p>
                    {item.riskFlags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.riskFlags.map((flag) => (
                          <span key={flag} className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
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
                        className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm hover:border-red-400 hover:text-red-300"
                      >
                        매물 보기
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
