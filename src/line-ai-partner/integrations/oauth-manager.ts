// LINE AI Partner – OAuth2 flow manager
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

export type OAuthServiceConfig = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
};

type TokenStore = {
  version: 1;
  tokens: Record<string, Record<string, TokenSet>>; // userId → service → tokens
};

// ---------------------------------------------------------------------------
// Service configs
// ---------------------------------------------------------------------------

const serviceConfigs: Record<string, () => OAuthServiceConfig> = {
  "google-calendar": () => ({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    redirectUri: process.env.OAUTH_REDIRECT_URI ?? "http://localhost:3000/oauth/callback",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  }),
  "google-drive": () => ({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    redirectUri: process.env.OAUTH_REDIRECT_URI ?? "http://localhost:3000/oauth/callback",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  }),
  notion: () => ({
    clientId: process.env.NOTION_CLIENT_ID ?? "",
    clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
    authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    redirectUri: process.env.OAUTH_REDIRECT_URI ?? "http://localhost:3000/oauth/callback",
    scopes: [],
  }),
};

// ---------------------------------------------------------------------------
// Token persistence
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(homedir(), ".openclaw", "line-ai-partner", "oauth-tokens.json");
}

async function loadStore(): Promise<TokenStore> {
  try {
    const raw = await readFile(storePath(), "utf-8");
    return JSON.parse(raw) as TokenStore;
  } catch {
    return { version: 1, tokens: {} };
  }
}

async function saveStore(store: TokenStore): Promise<void> {
  const dir = join(homedir(), ".openclaw", "line-ai-partner");
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate an OAuth2 authorization URL for a user + service. */
export function initiateOAuth(userId: string, service: string): string {
  const configFn = serviceConfigs[service];
  if (!configFn) {
    throw new Error(`Unknown service: ${service}`);
  }
  const config = configFn();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: `${userId}:${service}`,
    access_type: "offline",
    prompt: "consent",
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

/** Handle the OAuth2 callback and exchange code for tokens. */
export async function handleCallback(code: string, state: string): Promise<TokenSet> {
  const [userId, service] = state.split(":");
  if (!userId || !service) {
    throw new Error("Invalid OAuth state");
  }

  const configFn = serviceConfigs[service];
  if (!configFn) {
    throw new Error(`Unknown service: ${service}`);
  }
  const config = configFn();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const tokenSet: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };

  const store = await loadStore();
  if (!store.tokens[userId]) {
    store.tokens[userId] = {};
  }
  store.tokens[userId][service] = tokenSet;
  await saveStore(store);

  return tokenSet;
}

/** Refresh an expired token. */
export async function refreshToken(userId: string, service: string): Promise<TokenSet> {
  const store = await loadStore();
  const existing = store.tokens[userId]?.[service];
  if (!existing?.refreshToken) {
    throw new Error(`No refresh token for ${service}`);
  }

  const configFn = serviceConfigs[service];
  if (!configFn) {
    throw new Error(`Unknown service: ${service}`);
  }
  const config = configFn();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: existing.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const tokenSet: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? existing.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: existing.scope,
  };

  store.tokens[userId][service] = tokenSet;
  await saveStore(store);

  return tokenSet;
}

/** Get a valid access token, refreshing if expired. */
export async function getAccessToken(userId: string, service: string): Promise<string | null> {
  const store = await loadStore();
  const tokenSet = store.tokens[userId]?.[service];
  if (!tokenSet) {
    return null;
  }

  if (Date.now() >= tokenSet.expiresAt - 60_000) {
    const refreshed = await refreshToken(userId, service);
    return refreshed.accessToken;
  }

  return tokenSet.accessToken;
}

/** List services a user has connected. */
export async function getConnectedServices(userId: string): Promise<string[]> {
  const store = await loadStore();
  const userTokens = store.tokens[userId];
  if (!userTokens) {
    return [];
  }
  return Object.keys(userTokens);
}
