import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.BACKEND_API_BASE_URL ?? "http://localhost:3001";

const TRUSTED_PROXY_HEADER_NAME =
  process.env.TRUSTED_PROXY_HEADER_NAME ?? "x-internal-proxy-secret";
const TRUSTED_PROXY_SECRET = process.env.TRUSTED_PROXY_SECRET ?? "";

function makeBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL.replace(/\/$/, "")}${path}`;
}

function buildProxyHeaders(contentType?: string, userId?: string): Headers {
  const headers = new Headers();
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  headers.set(TRUSTED_PROXY_HEADER_NAME, TRUSTED_PROXY_SECRET);
  if (userId) {
    headers.set("x-clerk-user-id", userId);
  }
  return headers;
}

export async function requireSignedInUser(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!TRUSTED_PROXY_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }
  return null;
}

export async function proxyJsonPost(
  request: NextRequest,
  path: string,
): Promise<Response> {
  const { userId } = await auth();
  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/json";

  const upstream = await fetch(makeBackendUrl(path), {
    method: "POST",
    headers: buildProxyHeaders(contentType, userId ?? undefined),
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function proxySsePost(
  request: NextRequest,
  path: string,
): Promise<Response> {
  const { userId } = await auth();
  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/json";

  const upstream = await fetch(makeBackendUrl(path), {
    method: "POST",
    headers: buildProxyHeaders(contentType, userId ?? undefined),
    body,
    cache: "no-store",
  });

  if (!upstream.body) {
    return NextResponse.json(
      { error: "Upstream stream unavailable" },
      { status: 502 },
    );
  }

  const contentTypeHeader =
    upstream.headers.get("content-type") ?? "text/event-stream";

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentTypeHeader,
      "Cache-Control":
        upstream.headers.get("cache-control") ?? "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering":
        upstream.headers.get("x-accel-buffering") ?? "no",
    },
  });
}

export async function proxyGet(path: string): Promise<Response> {
  const upstream = await fetch(makeBackendUrl(path), {
    method: "GET",
    headers: buildProxyHeaders(),
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
