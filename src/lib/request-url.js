import { env } from "./env";

export function buildRedirectUrl(request, path) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return new URL(path, `${forwardedProto || "https"}://${forwardedHost}`);
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.hostname === "0.0.0.0" ? env.appUrl : requestUrl.origin;
  return new URL(path, origin);
}
