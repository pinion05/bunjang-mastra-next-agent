import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BunjangSearchRequestSchema } from "@/lib/bunjang/types";
import { runBunjangSearchAgent } from "@/mastra/agents/bunjang-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "bad_request", message: "JSON 본문이 잘못됨" },
        { status: 400 },
      );
    }

    const input = BunjangSearchRequestSchema.parse(body);
    const result = await runBunjangSearchAgent(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "bad_request", message: "검색 조건이 잘못됨", issues: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: "search_failed", message }, { status: 500 });
  }
}
