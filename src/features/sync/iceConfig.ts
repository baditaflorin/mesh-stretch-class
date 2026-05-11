import { appConfig } from "../../shared/config";

export type IceServer = {
  urls: string;
  username?: string;
  credential?: string;
};

export type TurnCredential = {
  username: string;
  password: string;
  ttl: number;
  uris: string[];
};

const ICE_KEY = `${appConfig.storagePrefix}:iceServers`;
const SIGNALING_KEY = `${appConfig.storagePrefix}:signalingUrl`;
const TOKEN_URL_KEY = `${appConfig.storagePrefix}:turnTokenUrl`;

const STUN_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const DEFAULT_ICE_SERVERS: IceServer[] = [...STUN_SERVERS];

const DEAD_SIGNALING_SERVERS = ["wss://signaling.yjs.dev", "ws://signaling.yjs.dev"];

export function loadIceServers(): IceServer[] {
  try {
    const raw = localStorage.getItem(ICE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as IceServer[];
    }
  } catch {
    // fall through
  }
  return DEFAULT_ICE_SERVERS;
}

export function saveIceServers(servers: IceServer[]): void {
  localStorage.setItem(ICE_KEY, JSON.stringify(servers));
}

export function resetIceServers(): void {
  localStorage.removeItem(ICE_KEY);
}

export function loadSignalingUrl(): string {
  const stored = localStorage.getItem(SIGNALING_KEY) ?? "";
  if (stored && DEAD_SIGNALING_SERVERS.includes(stored)) {
    localStorage.removeItem(SIGNALING_KEY);
    return "";
  }
  return stored || appConfig.signalingUrl;
}

export function saveSignalingUrl(url: string): void {
  const trimmed = url.trim();
  if (trimmed) localStorage.setItem(SIGNALING_KEY, trimmed);
  else localStorage.removeItem(SIGNALING_KEY);
}

export function loadTurnTokenUrl(): string {
  return localStorage.getItem(TOKEN_URL_KEY) ?? appConfig.turnTokenUrl;
}

export function saveTurnTokenUrl(url: string): void {
  const trimmed = url.trim();
  if (trimmed) localStorage.setItem(TOKEN_URL_KEY, trimmed);
  else localStorage.removeItem(TOKEN_URL_KEY);
}

export async function maybeFetchTurnCredentials(): Promise<void> {
  const tokenUrl = loadTurnTokenUrl();
  if (!tokenUrl) return;

  try {
    const res = await fetch(tokenUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const cred = (await res.json()) as TurnCredential;
    if (!Array.isArray(cred.uris) || cred.uris.length === 0) {
      throw new Error("Token server returned no TURN URIs");
    }

    saveIceServers([
      ...STUN_SERVERS,
      ...cred.uris.map((u) => ({
        urls: u,
        username: cred.username,
        credential: cred.password,
      })),
    ]);
  } catch (err) {
    console.warn("[turn] credential fetch failed — STUN-only fallback:", err);
  }
}
