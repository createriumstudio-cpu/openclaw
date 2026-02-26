// LINE AI Partner – Lightweight Gemini REST client
//
// Calls the Gemini API directly via fetch(), avoiding the heavyweight
// runEmbeddedPiAgent dependency chain (model registry, auth profiles,
// models.json, agent dirs, etc.).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { createStandaloneLogger } from "./standalone-logger.js";

const log = createStandaloneLogger("line-ai-partner:gemini");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.LLM_MODEL ?? "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Keep last N turns (user + model pairs) in context to stay within token limits.
const MAX_HISTORY_TURNS = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "user" | "model";

type Turn = {
  role: Role;
  text: string;
};

type GeminiContent = {
  role: Role;
  parts: { text: string }[];
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { message?: string; code?: number };
};

// ---------------------------------------------------------------------------
// Session persistence (simple JSONL per user)
// ---------------------------------------------------------------------------

function sessionPath(userId: string): string {
  return join(homedir(), ".openclaw", "line-ai-partner", "sessions", `${userId}.jsonl`);
}

async function loadHistory(userId: string): Promise<Turn[]> {
  try {
    const raw = await readFile(sessionPath(userId), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const turns: Turn[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Turn;
        if (parsed.role && parsed.text) {
          turns.push(parsed);
        }
      } catch {
        // skip malformed lines
      }
    }
    // Keep only the most recent turns
    return turns.slice(-MAX_HISTORY_TURNS * 2);
  } catch {
    return [];
  }
}

async function appendTurn(userId: string, turn: Turn): Promise<void> {
  const filePath = sessionPath(userId);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(turn) + "\n", { flag: "a" });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a message to Gemini and get a text response.
 * Maintains per-user conversation history for context.
 */
export async function chatWithGemini(
  userId: string,
  userMessage: string,
  systemPrompt: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    log.warn("GEMINI_API_KEY not set");
    return "ごめんね、今ちょっと調子悪いみたい。少し待ってからもう一度話しかけてね。";
  }

  // Build conversation history
  const history = await loadHistory(userId);
  const contents: GeminiContent[] = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.9,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      log.warn(`Gemini API ${resp.status}: ${errBody.slice(0, 200)}`);
      return "ごめんね、今ちょっと調子悪いみたい。少し待ってからもう一度話しかけてね。";
    }

    const data = (await resp.json()) as GeminiResponse;

    if (data.error) {
      log.warn(`Gemini API error: ${data.error.message}`);
      return "ごめんね、今ちょっと調子悪いみたい。少し待ってからもう一度話しかけてね。";
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("");

    if (!text) {
      log.warn(`Gemini returned empty response for userId=${userId}`);
      return "ごめんね、うまく考えがまとまらなかった。もう一回言ってくれる？";
    }

    // Persist both turns for future context
    await appendTurn(userId, { role: "user", text: userMessage });
    await appendTurn(userId, { role: "model", text });

    return text;
  } catch (err) {
    log.warn(`Gemini call failed for userId=${userId}: ${String(err)}`);
    return "ごめんね、今ちょっと調子悪いみたい。少し待ってからもう一度話しかけてね。";
  }
}
