import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const encoder = new TextEncoder();

function getSecret(type) {
  return encoder.encode(type === "refresh" ? env.refreshSecret : env.accessSecret);
}

export async function signAccessToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret("access"));
}

export async function signRefreshToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret("refresh"));
}

export async function verifyAccessToken(token) {
  const result = await jwtVerify(token, getSecret("access"));
  return result.payload;
}

export async function verifyRefreshToken(token) {
  const result = await jwtVerify(token, getSecret("refresh"));
  return result.payload;
}
