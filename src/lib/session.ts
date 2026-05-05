import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "eierhof-session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

type SessionPayload = { userId: string; role: "ADMIN" | "FAHRER"; iat: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (Date.now() / 1000 - parsed.iat > MAX_AGE_SEC) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(payload: Omit<SessionPayload, "iat">) {
  const cookieStore = await cookies();
  const token = encode({ ...payload, iat: Math.floor(Date.now() / 1000) });
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}
