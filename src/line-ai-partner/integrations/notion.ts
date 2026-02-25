// LINE AI Partner – Notion integration
import { getAccessToken } from "./oauth-manager.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotionPage = {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  properties: Record<string, unknown>;
};

type NotionQueryResponse = {
  results: Array<{
    id: string;
    url: string;
    last_edited_time: string;
    properties: Record<string, unknown>;
  }>;
};

const NOTION_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function notionFetch(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken(userId, "notion");
  if (!token) throw new Error("Notion not connected");

  return fetch(`${NOTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...init?.headers,
    },
  });
}

function extractTitle(properties: Record<string, unknown>): string {
  // Notion title property is typically an array of rich_text objects
  for (const val of Object.values(properties)) {
    const prop = val as { type?: string; title?: Array<{ plain_text: string }> };
    if (prop.type === "title" && prop.title?.length) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "(無題)";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Query a Notion database with an optional filter. */
export async function queryDatabase(
  userId: string,
  databaseId: string,
  filter?: Record<string, unknown>,
): Promise<NotionPage[]> {
  const body: Record<string, unknown> = { page_size: 20 };
  if (filter && Object.keys(filter).length > 0) {
    body.filter = filter;
  }

  const res = await notionFetch(
    userId,
    `/databases/${databaseId}/query`,
    { method: "POST", body: JSON.stringify(body) },
  );

  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status}`);
  }

  const data = (await res.json()) as NotionQueryResponse;
  return data.results.map((r) => ({
    id: r.id,
    title: extractTitle(r.properties),
    url: r.url,
    lastEditedTime: r.last_edited_time,
    properties: r.properties,
  }));
}

/** Create a new page in a Notion database. */
export async function createPage(
  userId: string,
  databaseId: string,
  properties: Record<string, unknown>,
): Promise<string> {
  const body = {
    parent: { database_id: databaseId },
    properties,
  };

  const res = await notionFetch(userId, "/pages", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Notion page: ${res.status}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}
