// LINE AI Partner – Standalone HTTP server for fly.io deployment
// Default LLM: claude-sonnet-4-6 (see src/agents/defaults.ts)
//
// Handles:
//   POST /webhook  — LINE webhook events (signature verified)
//   GET  /health   — Health check endpoint
//
// All optional dependencies (routeMessage, cron-manager) are loaded lazily
// at runtime. If they fail to import, the server still starts and responds
// with a friendly fallback message.
//
// Deploy: push to branch triggers fly.io redeploy via GitHub Actions.
// GEMINI_API_KEY added to fly.io secrets - deploy trigger

import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.PORT) || 3000;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

// ---------------------------------------------------------------------------
// Lazy-loaded optional modules (graceful fallback on import failure)
// ---------------------------------------------------------------------------

type RouteMessageFn = (userId: string, message: string) => Promise<{ text: string }>;
type StartCronFn = (cb: {
  onMorningGreeting: (userId: string, hhmm: string) => Promise<void>;
  onReminder: (userId: string, message: string) => Promise<void>;
}) => void;
type StopCronFn = () => void;

let routeMessageFn: RouteMessageFn | null = null;
let startCronEngineFn: StartCronFn | null = null;
let stopCronEngineFn: StopCronFn | null = null;

async function loadOptionalModules(): Promise<void> {
  // message-router (depends on many parent modules)
  try {
    const mod = await import("./message-router.js");
    routeMessageFn = mod.routeMessage;
    console.log("  [ok] message-router loaded");
  } catch (err) {
    console.warn(`  [skip] message-router unavailable: ${(err as Error).message}`);
  }

  // cron-manager (self-contained, should usually work)
  try {
    const mod = await import("./cron-manager.js");
    startCronEngineFn = mod.startCronEngine;
    stopCronEngineFn = mod.stopCronEngine;
    console.log("  [ok] cron-manager loaded");
  } catch (err) {
    console.warn(`  [skip] cron-manager unavailable: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// LINE signature verification (HMAC-SHA256, timing-safe)
// ---------------------------------------------------------------------------

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto.createHmac("SHA256", LINE_CHANNEL_SECRET).update(body).digest("base64");
  const hashBuf = Buffer.from(hash);
  const sigBuf = Buffer.from(signature);
  if (hashBuf.length !== sigBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuf, sigBuf);
}

// ---------------------------------------------------------------------------
// LINE Messaging API – reply/push helpers
// ---------------------------------------------------------------------------

async function replyText(replyToken: string, text: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    console.error(`LINE reply failed: ${res.status} ${await res.text()}`);
  }
}

async function pushText(userId: string, text: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    console.error(`LINE push failed: ${res.status} ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Request body reader
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 1024 * 1024; // 1MB
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        req.destroy();
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Webhook event handler
// ---------------------------------------------------------------------------

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string; groupId?: string; roomId?: string };
  message?: { type: string; text?: string };
  postback?: { data: string };
};

const FALLBACK_REPLY = "サーバーを準備中です。しばらく待ってからもう一度話しかけてね！";

async function handleEvent(event: LineEvent): Promise<void> {
  if (event.type !== "message" || event.message?.type !== "text" || !event.message.text) {
    return;
  }

  const userId = event.source?.userId ?? "";
  if (!userId) {
    return;
  }

  try {
    const reply = routeMessageFn
      ? await routeMessageFn(userId, event.message.text)
      : { text: FALLBACK_REPLY };

    if (event.replyToken) {
      await replyText(event.replyToken, reply.text);
    } else {
      await pushText(userId, reply.text);
    }
  } catch (err) {
    console.error(`handleEvent error for user=${userId}:`, err);
    if (event.replyToken) {
      await replyText(
        event.replyToken,
        "ごめんね、エラーが発生しちゃった。もう一度試してね。",
      ).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "/";

  // Health check
  if (url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        modules: {
          messageRouter: routeMessageFn != null,
          cronEngine: startCronEngineFn != null,
        },
      }),
    );
    return;
  }

  // LINE webhook
  if (url === "/webhook" && req.method === "POST") {
    try {
      const rawBody = await readBody(req);
      const signature = (req.headers["x-line-signature"] as string) ?? "";

      // Verification request (no signature, empty events)
      if (!signature) {
        try {
          const parsed = JSON.parse(rawBody) as { events?: unknown[] };
          if (Array.isArray(parsed.events) && parsed.events.length === 0) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
            return;
          }
        } catch {
          // not valid JSON — fall through to 400
        }
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing X-Line-Signature" }));
        return;
      }

      if (!verifySignature(rawBody, signature)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }

      // Respond 200 immediately (LINE requires < 1s)
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));

      // Process events async
      const body = JSON.parse(rawBody) as { events?: LineEvent[] };
      if (body.events && body.events.length > 0) {
        for (const event of body.events) {
          handleEvent(event).catch((err) => {
            console.error("Event handler error:", err);
          });
        }
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
      console.error("Webhook error:", err);
    }
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("LINE AI Partner – loading modules...");
  await loadOptionalModules();

  server.listen(PORT, () => {
    console.log(`LINE AI Partner server listening on port ${PORT}`);
    console.log(`  webhook: POST /webhook`);
    console.log(`  health:  GET  /health`);
    if (!LINE_CHANNEL_SECRET) {
      console.warn("  WARNING: LINE_CHANNEL_SECRET not set");
    }
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.warn("  WARNING: LINE_CHANNEL_ACCESS_TOKEN not set");
    }
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      console.warn("  WARNING: No LLM API key set (GEMINI_API_KEY / ANTHROPIC_API_KEY)");
    }
    console.log(
      `  LLM: ${process.env.LLM_PROVIDER ?? "google"}/${process.env.LLM_MODEL ?? "gemini-2.5-flash"}`,
    );

    // Start cron engine if available
    if (startCronEngineFn) {
      startCronEngineFn({
        onMorningGreeting: async (userId, hhmm) => {
          console.log(`[cron] morning greeting for ${userId} at ${hhmm}`);
          await pushText(userId, `おはよう！今日も一日頑張ろうね (${hhmm})`);
        },
        onReminder: async (userId, message) => {
          console.log(`[cron] reminder for ${userId}: ${message}`);
          await pushText(userId, `リマインダー: ${message}`);
        },
      });
      console.log("  cron engine started");
    }
  });
}

// Graceful shutdown
function shutdown(): void {
  console.log("Shutting down...");
  if (stopCronEngineFn) {
    stopCronEngineFn();
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
