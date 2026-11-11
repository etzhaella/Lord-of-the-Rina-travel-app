export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: { "content-type": "application/json", ...(rest.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const photoUrl = (name?: string | null, w = 600) =>
  name ? `/api/places/photo?name=${encodeURIComponent(name)}&w=${w}` : null;
