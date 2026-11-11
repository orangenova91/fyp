import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const COOKIE_NAME = "capstone_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type SessionData = { userId?: number };

function password() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters (see .env.example).");
  }
  return secret;
}

export async function getSessionUserId(): Promise<number | null> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  const data = await unsealData<SessionData>(cookie, { password: password(), ttl: MAX_AGE_SECONDS });
  return data.userId ?? null;
}

export async function createSession(userId: number) {
  const sealed = await sealData({ userId } satisfies SessionData, {
    password: password(),
    ttl: MAX_AGE_SECONDS,
  });
  (await cookies()).set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
