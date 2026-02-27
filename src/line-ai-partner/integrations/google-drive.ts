// LINE AI Partner – Google Drive integration
import { getAccessToken } from "./oauth-manager.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
};

type GDriveListResponse = {
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    webViewLink?: string;
  }>;
};

const GDRIVE_BASE = "https://www.googleapis.com/drive/v3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function driveFetch(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken(userId, "google-drive");
  if (!token) throw new Error("Google Drive not connected");

  return fetch(`${GDRIVE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Search files by query string. */
export async function searchFiles(
  userId: string,
  query: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `name contains '${query.replace(/'/g, "\\'")}'`,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    pageSize: "10",
    orderBy: "modifiedTime desc",
  });

  const res = await driveFetch(userId, `/files?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Drive API error: ${res.status}`);
  }

  const data = (await res.json()) as GDriveListResponse;
  return (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
}

/** Get the text content of a Google Docs or plain text file. */
export async function getFileContent(
  userId: string,
  fileId: string,
): Promise<string> {
  // For Google Docs, export as plain text
  const res = await driveFetch(
    userId,
    `/files/${fileId}/export?mimeType=text/plain`,
  );

  if (res.status === 403 || res.status === 404) {
    // Not a Google Docs file — try direct download
    const dlRes = await driveFetch(userId, `/files/${fileId}?alt=media`);
    if (!dlRes.ok) {
      throw new Error(`Failed to download file: ${dlRes.status}`);
    }
    return dlRes.text();
  }

  if (!res.ok) {
    throw new Error(`Failed to export file: ${res.status}`);
  }

  return res.text();
}
