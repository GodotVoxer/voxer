import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedApiMutationOrigin } from "@/server/http/apiMutationOrigin";
import { rateLimitInMemory } from "@/server/http/rateLimitMemory";
import { requestClientIp } from "@/server/http/requestIp";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Reads per IP and instance, in memory. High on purpose (many users share an IP behind NAT): it stops floods, not normal use. */
const API_READS_PER_MINUTE = 300;
const API_READ_WINDOW_MS = 60_000;

export const proxy = (request: NextRequest) => {
  if (!MUTATION_METHODS.has(request.method)) {
    const ip = requestClientIp(request);
    if (
      ip !== "local" &&
      !rateLimitInMemory(`api-read:${ip}`, API_READS_PER_MINUTE, API_READ_WINDOW_MS)
    ) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá un momento." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    return NextResponse.next();
  }
  if (
    !isAllowedApiMutationOrigin({
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      secFetchSite: request.headers.get("sec-fetch-site"),
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.next();
};

export const config = {
  matcher: "/api/:path*",
};
