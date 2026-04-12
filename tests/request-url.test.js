import { describe, expect, it } from "vitest";
import { buildRedirectUrl } from "../src/lib/request-url";

function createRequest(url, headers = {}) {
  return {
    url,
    headers: {
      get(name) {
        return headers[name] || null;
      }
    }
  };
}

describe("buildRedirectUrl", () => {
  it("prefers forwarded host and protocol", () => {
    const url = buildRedirectUrl(createRequest("http://0.0.0.0:3000/api/v1/auth/login", {
      "x-forwarded-host": "pos.example.com",
      "x-forwarded-proto": "https"
    }), "/admin/pos");

    expect(url.toString()).toBe("https://pos.example.com/admin/pos");
  });

  it("falls back to APP_URL when request origin is internal", () => {
    const url = buildRedirectUrl(createRequest("http://0.0.0.0:3000/api/v1/auth/login"), "/admin/pos");

    expect(url.toString()).toBe("http://localhost:3000/admin/pos");
  });

  it("uses the request origin when it is already public", () => {
    const url = buildRedirectUrl(createRequest("https://pos.example.com/api/v1/auth/login"), "/admin/pos");

    expect(url.toString()).toBe("https://pos.example.com/admin/pos");
  });
});
