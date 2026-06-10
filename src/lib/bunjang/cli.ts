import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { normalizeBunjangItem, rankBunjangListings } from "./normalize";
import type { BunjangListing, BunjangSearchRequest, BunjangSearchResponse } from "./types";

const execFileAsync = promisify(execFile);

function bunjangCliBin(): string {
  return process.env.BUNJANG_CLI_BIN ?? path.join(process.cwd(), "node_modules", ".bin", "bunjang-cli");
}

function parseJsonFromStdout(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error("bunjang-cli stdout empty");

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error(`bunjang-cli JSON parse failed: ${trimmed.slice(0, 400)}`);
  }
}

type CliSearchResult = {
  items?: unknown[];
  transportUsed?: string;
};

export async function collectBunjangListings(request: BunjangSearchRequest): Promise<BunjangListing[]> {
  const args = [
    "--json",
    "search",
    request.query,
    "--max-items",
    String(request.maxItems),
    "--preferred-transport",
    "api",
  ];

  if (request.withDetail) args.push("--with-detail");

  const { stdout, stderr } = await execFileAsync(bunjangCliBin(), args, {
    cwd: process.cwd(),
    timeout: Number(process.env.BUNJANG_CLI_TIMEOUT_MS ?? 90_000),
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });

  const parsed = parseJsonFromStdout(stdout) as CliSearchResult;
  if (!Array.isArray(parsed.items)) {
    throw new Error(`bunjang-cli items missing. stderr=${stderr.slice(0, 400)}`);
  }

  return parsed.items.map((item) => normalizeBunjangItem(item as never, request.query));
}

export async function searchBunjangListings(request: BunjangSearchRequest): Promise<BunjangSearchResponse> {
  const allListings = await collectBunjangListings(request);
  const recommended = rankBunjangListings(allListings, request.finalCandidateCount);

  return {
    mode: "deterministic",
    query: request.query,
    collectedCount: allListings.length,
    recommended,
    allListings,
    notes: [
      "bunjang-cli subprocess 재사용",
      "찜/채팅/구매 없음: read-only 검색만 수행",
      "가격은 raw text 첫 원화 표기를 우선 파싱",
    ],
  };
}
