import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "notepad_session";

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  const left = new TextEncoder().encode(input);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({ scope: "notepad" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretBytes(secret));
}

export async function readSessionToken(
  token: string | undefined,
  secret: string
): Promise<{ ok: boolean }> {
  if (!token) {
    return { ok: false };
  }

  try {
    const result = await jwtVerify(token, secretBytes(secret));
    return { ok: result.payload.scope === "notepad" };
  } catch {
    return { ok: false };
  }
}
