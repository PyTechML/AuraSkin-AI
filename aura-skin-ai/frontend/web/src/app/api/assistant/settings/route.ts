import { NextResponse } from "next/server";
import type { AssistantSettings } from "@/server/assistant/defaults";
import {
  getAssistantServerState,
  updateAssistantSettings,
} from "@/server/assistant/state";

function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export async function GET() {
  const state = getAssistantServerState();
  return json({ ok: true, settings: state.settings });
}

export async function POST(req: Request) {
  let partial: Partial<AssistantSettings>;
  try {
    partial = (await req.json()) as Partial<AssistantSettings>;
  } catch {
    return json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const next = updateAssistantSettings(partial);
  return json({ ok: true, settings: next });
}

