import { apiRequest } from "./queryClient";
import { getSessionId } from "./session";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-session-id": getSessionId(),
    ...(options.headers as Record<string, string> || {}),
  };
  return apiRequest(url, {
    ...options,
    headers,
  });
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "x-session-id": getSessionId() },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSessionId(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "x-session-id": getSessionId() },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Delete failed");
}
