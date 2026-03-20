import { NextResponse } from "next/server";
import { getAssistantServerState } from "@/server/assistant/state";

function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export async function GET() {
  const state = getAssistantServerState();
  const avgTokens =
    state.usage.totalQueries > 0
      ? Math.round(state.usage.tokensUsedTotalApprox / state.usage.totalQueries)
      : 0;

  return json({
    ok: true,
    usage: state.usage,
    averageTokensUsedApprox: avgTokens,
  });
}

