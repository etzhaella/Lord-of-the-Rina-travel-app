// Same-origin proxy: the browser calls /api/*, Next forwards to the backend.
// BACKEND_URL is read at request time, so the same image works in
// docker-compose (http://backend:8000) and on Cloud Run (the backend's URL).
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const DROP = ["content-encoding", "content-length", "transfer-encoding", "connection"];

// Cloud Run blocks public access (organization policy). The frontend calls the
// backend with an identity token from the metadata server. Locally that server
// does not exist, so the call stays unauthenticated.
async function cloudRunAuth(audience: string): Promise<Record<string, string>> {
  if (!audience.startsWith("https://")) return {};
  try {
    const res = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`,
      { headers: { "Metadata-Flavor": "Google" }, cache: "no-store" },
    );
    if (!res.ok) return {};
    return { authorization: `Bearer ${await res.text()}` };
  } catch {
    return {};
  }
}

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${BACKEND}/api/${params.path.join("/")}${req.nextUrl.search}`;
  const audience = new URL(BACKEND).origin;
  const init: RequestInit = {
    method: req.method,
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      ...(await cloudRunAuth(audience)),
    },
    redirect: "manual",
    cache: "no-store",
  };
  if (!["GET", "HEAD"].includes(req.method)) init.body = await req.text();

  try {
    const res = await fetch(url, init);
    const headers = new Headers();
    res.headers.forEach((v, k) => {
      if (!DROP.includes(k.toLowerCase())) headers.set(k, v);
    });
    const body = res.status === 204 || res.status === 302 ? null : await res.arrayBuffer();
    return new Response(body, { status: res.status, headers });
  } catch {
    return Response.json({ detail: "backend unreachable" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE, proxy as PUT };
