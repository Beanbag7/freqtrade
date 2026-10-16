import { useAuthStore } from "@/lib/auth";

const BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/token/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) {
      logout();
      return false;
    }
    const data = (await res.json()) as { access_token: string };
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

/** Single-flight refresh so concurrent 401s only refresh once. */
function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PATCH";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  /** Array values are appended as repeated params (FastAPI list[str] = Query). */
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  /** skip auth header (public endpoints) */
  public?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, item);
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const headers: Record<string, string> = {};
  if (!options.public && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "无法连接到 freqtrade API,请确认机器人已启动。");
  }

  if (res.status === 401 && retry && !options.public) {
    const ok = await refreshOnce();
    if (ok) return api<T>(path, options, false);
    useAuthStore.getState().logout();
    // The router guard only runs on navigation, so push to /login explicitly,
    // otherwise the user stays stranded on a page whose requests all fail.
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new ApiError(401, "登录已过期,请重新登录。");
  }

  if (!res.ok) {
    let detail = `请求失败 (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) detail = data.detail[0].msg;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, detail);
  }

  return (await res.json()) as T;
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** Login against POST /api/v1/token/login (HTTP Basic credentials). */
export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/token/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${toBase64(`${username}:${password}`)}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, "用户名或密码错误。");
    throw new ApiError(res.status, "登录失败,请稍后重试。");
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
}
