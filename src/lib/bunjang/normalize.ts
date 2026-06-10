import type { BunjangListing } from "./types";

type RawBunjangItem = {
  id?: string | number;
  pid?: string | number;
  productId?: string | number;
  title?: string;
  name?: string;
  url?: string;
  price?: number | string | null;
  currency?: string;
  imageUrl?: string | null;
  image?: string | null;
  location?: string | null;
  transportUsed?: string;
  detail?: { description?: string; text?: string } | string | null;
  raw?: { text?: string; priceText?: string | null; page?: number };
};

const WON_RE = /([0-9][0-9,]{2,})\s*원/;
const RISK_PATTERNS: Array<[RegExp, string]> = [
  [/^\s*AD/i, "광고"],
  [/(삽니다|구매합니다|매입|고가매입)/, "구매/매입글"],
  [/(교환|교신)/, "교환글"],
  [/(케이스|필름|강화유리|박스만|공박스|부품|수리|액정만)/, "부품/액세서리 가능"],
  [/(하자|파손|고장|침수|잔상|먹통)/, "상태 리스크"],
];

function firstWon(text: string): number | null {
  const match = text.match(WON_RE);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}

function cleanTitle(rawTitle: string, rawText: string): string {
  const titleLooksLikePrice = /^[0-9,]+원$/.test(rawTitle.trim());
  if (!titleLooksLikePrice && rawTitle.trim()) return rawTitle.trim();

  return rawText
    .replace(/^\s*AD\s*/i, "")
    .replace(WON_RE, "")
    .replace(/\s+/g, " ")
    .trim() || rawTitle.trim() || "제목 없음";
}

function riskFlagsFor(text: string): string[] {
  return RISK_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, flag]) => flag);
}

function tokenHits(query: string, haystack: string): number {
  const tokens = query
    .toLowerCase()
    .split(/[\s,/+_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) return 0;
  const lower = haystack.toLowerCase();
  return tokens.filter((token) => lower.includes(token)).length / tokens.length;
}

export function normalizeBunjangItem(item: RawBunjangItem, query: string): BunjangListing {
  const id = String(item.id ?? item.pid ?? item.productId ?? "");
  const rawText = item.raw?.text ?? "";
  const rawTitle = item.title ?? item.name ?? "";
  const title = cleanTitle(rawTitle, rawText);
  const priceFromRaw = firstWon(rawText);
  const parsedPrice = typeof item.price === "string" ? Number(item.price.replaceAll(",", "")) : item.price;
  const price = priceFromRaw ?? (Number.isFinite(parsedPrice) ? Number(parsedPrice) : null);
  const detailText = typeof item.detail === "string" ? item.detail : item.detail?.description ?? item.detail?.text ?? undefined;
  const combined = `${title} ${rawText} ${detailText ?? ""}`;
  const riskFlags = riskFlagsFor(combined);
  const relevance = tokenHits(query, combined);
  const hasImage = Boolean(item.imageUrl ?? item.image);

  const score = Math.round(
    relevance * 55 +
      (hasImage ? 12 : 0) +
      (price ? 8 : -6) +
      Math.min(title.length, 40) * 0.35 +
      Math.min(detailText?.length ?? 0, 300) * 0.03 -
      riskFlags.length * 14,
  );

  const reasonParts = [
    relevance > 0 ? `검색어 매칭 ${Math.round(relevance * 100)}%` : "검색어 매칭 약함",
    price ? `가격 ${price.toLocaleString("ko-KR")}원` : "가격 불명",
    hasImage ? "이미지 있음" : "이미지 없음",
  ];

  if (riskFlags.length) reasonParts.push(`리스크: ${riskFlags.join(", ")}`);

  return {
    id,
    title,
    url: item.url ?? (id ? `https://m.bunjang.co.kr/products/${id}` : undefined),
    price,
    currency: item.currency ?? "KRW",
    imageUrl: item.imageUrl ?? item.image ?? null,
    location: item.location ?? null,
    transportUsed: item.transportUsed,
    rawText,
    detailText,
    sourcePage: item.raw?.page ?? null,
    riskFlags,
    score,
    reason: reasonParts.join(" · "),
  };
}

export function rankBunjangListings(items: BunjangListing[], finalCandidateCount: number): BunjangListing[] {
  return [...items]
    .filter((item) => item.id && item.title)
    .sort((a, b) => b.score - a.score)
    .slice(0, finalCandidateCount);
}
