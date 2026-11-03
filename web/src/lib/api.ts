import type {
  CatalogResponse,
  ChapterContext,
  Health,
  Progress,
  ProgressSummary,
  Quiz,
  QuizGrade,
  StreamEvent,
  ThreadDetail,
  ThreadGroup,
} from "@/lib/types";
import { currentLanguage } from "@/lib/i18n";

/** Port the FastAPI backend is published on during local development. */
const API_PORT = 8000;

/** Template values from .env.example — treated as "not configured" rather than used. */
const PLACEHOLDER_HOSTS = new Set(["api.example.com", "example.com", "your-app.vercel.app"]);

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
}

function pageIsDeployed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return !isLocalHost(window.location.hostname);
}

/**
 * The configured API origin, or "" when nothing usable is configured.
 *
 * Two traps are filtered out here so a stale value cannot break a local run:
 *   - the placeholder from .env.example (`https://api.example.com`);
 *   - a localhost base that was committed/built into a deployed bundle.
 */
function configuredBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    if (PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase())) {
      return "";
    }
    if (isLocalHost(url.hostname) && pageIsDeployed()) {
      return "";
    }
    return raw;
  } catch {
    return "";
  }
}

/**
 * Resolve the API base URL when a request is made, rather than baking it in.
 *
 * Precedence:
 *   1. NEXT_PUBLIC_API_BASE — the AWS host, set in Vercel's project settings.
 *   2. Same host, port 8000 — local development (Next on :3000, FastAPI on :8000).
 *   3. Same origin — behind a reverse proxy that also serves /api.
 */
function apiBase(): string {
  const configured = configuredBase();
  if (configured) {
    return configured;
  }

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${API_PORT}`;
  }

  const { protocol, hostname, port } = window.location;
  if (!port || port === "80" || port === "443") {
    // Deployed on a managed host with no API base configured: same-origin would 404
    // on every call, so fail with an actionable message instead.
    if (hostname.endsWith(".vercel.app")) {
      throw new ApiError(
        "NEXT_PUBLIC_API_BASE সেট করা নেই। Vercel-এ Project → Settings → Environment Variables-এ ব্যাকএন্ডের HTTPS ঠিকানা (যেমন https://api.your-domain) যোগ করে আবার deploy করুন।",
        0,
      );
    }
    return "";
  }
  return `${protocol}//${hostname}:${API_PORT}`;
}

/** The base URL a request would use right now — shown on the connection-error screen. */
export function apiBaseUrl(): string {
  try {
    return apiBase() || "(একই অরিজিন)";
  } catch (error) {
    return error instanceof Error ? error.message : "(অজানা)";
  }
}

/** One consistent, actionable message for every transport-level failure. */
function unreachable(base: string, error: unknown): ApiError {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  const target = base || "(একই অরিজিন)";
  const local = /127\.0\.0\.1|localhost/.test(base);
  const hint = local
    ? "ব্যাকএন্ড চালু আছে কি? টার্মিনালে চালাও: python -m backend.run"
    : "ব্যাকএন্ডের ঠিকানা ঠিক আছে কি, আর ব্যাকএন্ডে এই অরিজিন CORS-এ অনুমোদিত কি?";
  return new ApiError(`সার্ভারে সংযোগ করা যায়নি — ${target}। ${hint} [${detail}]`, 0);
}

/**
 * Stable per-browser identifier, persisted in localStorage and sent as `X-Client-Id`.
 * The API stores it on each thread and only returns threads owned by it, so two
 * browsers on the same server never see each other's history.
 */
const CLIENT_ID_KEY = "patsomadhan.client_id";
let cachedClientId: string | null = null;

function clientId(): string {
  if (cachedClientId) {
    return cachedClientId;
  }
  if (typeof window === "undefined") {
    return (cachedClientId = "server");
  }
  try {
    const stored = window.localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      return (cachedClientId = stored);
    }
    const created =
      window.crypto?.randomUUID?.() ??
      `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    return (cachedClientId = created);
  } catch {
    // Storage can be unavailable (private mode); a per-session id still separates tabs.
    return (cachedClientId = `session-${Date.now().toString(36)}`);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `অনুরোধ ব্যর্থ হয়েছে (HTTP ${response.status})`;
  }
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    const detail = parsed.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
  } catch {
    return text.slice(0, 300);
  }
  return text.slice(0, 300);
}

/** Headers every request carries: per-browser identity and the UI language. */
function baseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Client-Id": clientId(),
    "X-Client-Lang": currentLanguage(),
  };
}

/**
 * Stamp the context with the language currently selected in the UI.
 *
 * The UI language always wins: switching to Bangla mid-thread must change the answer
 * language of the next question, not keep whatever the thread was created with.
 */
function withLanguage(context: ChapterContext): ChapterContext {
  return { ...context, language: currentLanguage() };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...baseHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw unreachable(base, error);
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),

  /**
   * The class → subject → chapter catalog. Passing the version the client already has
   * lets the backend answer 304 and the caller keep its cached copy.
   */
  catalog: async (knownVersion?: string): Promise<CatalogResponse | null> => {
    const base = apiBase();
    let response: Response;
    try {
      response = await fetch(`${base}/api/catalog`, {
        headers: knownVersion ? { "If-None-Match": `"${knownVersion}"` } : {},
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw unreachable(base, error);
    }
    if (response.status === 304) {
      return null;
    }
    if (!response.ok) {
      throw new ApiError(await readError(response), response.status);
    }
    return (await response.json()) as CatalogResponse;
  },

  threads: () => request<ThreadGroup[]>("/api/threads"),
  thread: (threadId: string) => request<ThreadDetail>(`/api/threads/${threadId}`),
  createThread: (context: ChapterContext) =>
    request<ThreadDetail>("/api/threads", {
      method: "POST",
      body: JSON.stringify({ context: withLanguage(context) }),
    }),
  updateContext: (threadId: string, context: ChapterContext) =>
    request<ThreadDetail>(`/api/threads/${threadId}/context`, {
      method: "PUT",
      body: JSON.stringify({ context: withLanguage(context) }),
    }),
  renameThread: (threadId: string, title: string) =>
    request<ThreadDetail>(`/api/threads/${threadId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteThread: (threadId: string) => request<void>(`/api/threads/${threadId}`, { method: "DELETE" }),

  generateQuiz: (context: ChapterContext, student: string, count = 5) =>
    request<Quiz>("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ context: withLanguage(context), student, count }),
    }),
  submitQuiz: (quizId: string, student: string, answers: (number | null)[]) =>
    request<QuizGrade>("/api/quiz/submit", {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId, student, answers }),
    }),

  progress: (student: string) =>
    request<Progress>(`/api/progress?student=${encodeURIComponent(student)}`),
  summary: (student: string) =>
    request<ProgressSummary>(`/api/progress/summary?student=${encodeURIComponent(student)}`),
};

/**
 * POSTs a question and yields parsed NDJSON events as they arrive.
 * NDJSON (one JSON object per line) is used instead of SSE because the request
 * carries a body and must surface errors mid-stream.
 */
export async function* streamChat(
  threadId: string,
  message: string,
  context: ChapterContext,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const base = apiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/api/threads/${threadId}/chat`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ message, context: withLanguage(context) }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw unreachable(base, error);
  }

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (!response.body) {
    throw new ApiError("সার্ভার থেকে কোনো স্ট্রিম পাওয়া যায়নি।", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          yield JSON.parse(line) as StreamEvent;
        }
        newline = buffer.indexOf("\n");
      }
    }
    const tail = buffer.trim();
    if (tail) {
      yield JSON.parse(tail) as StreamEvent;
    }
  } finally {
    reader.releaseLock();
  }
}
