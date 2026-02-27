// LINE AI Partner – Google Calendar integration (API v3)
import { getAccessToken } from "./oauth-manager.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO 8601
  end: string;
  location?: string;
  htmlLink?: string;
};

type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
};

type GCalListResponse = {
  items?: GCalEvent[];
};

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGCalEvent(e: GCalEvent): CalendarEvent {
  return {
    id: e.id,
    summary: e.summary ?? "(無題)",
    description: e.description,
    start: e.start?.dateTime ?? e.start?.date ?? "",
    end: e.end?.dateTime ?? e.end?.date ?? "",
    location: e.location,
    htmlLink: e.htmlLink,
  };
}

async function calendarFetch(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken(userId, "google-calendar");
  if (!token) throw new Error("Google Calendar not connected");

  return fetch(`${GCAL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get today's events from the user's primary calendar. */
export async function getTodaySchedule(
  userId: string,
): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });

  const res = await calendarFetch(
    userId,
    `/calendars/primary/events?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }

  const data = (await res.json()) as GCalListResponse;
  return (data.items ?? []).map(parseGCalEvent);
}

/** Create a new event on the user's primary calendar. */
export async function createEvent(
  userId: string,
  event: Pick<CalendarEvent, "summary" | "start" | "end" | "description" | "location">,
): Promise<string> {
  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
  };

  const res = await calendarFetch(userId, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to create event: ${res.status}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}
