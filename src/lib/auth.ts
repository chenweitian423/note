import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "notepad_session";

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

type EnvSource = Record<string, string | undefined>;

type EnvRules = {
  disallowValues?: string[];
  requireMixedCase?: boolean;
  minLength?: number;
};

export function getRequiredEnv(name: string, rules: EnvRules = {}, source: EnvSource = process.env): string {
  const value = source[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (rules.disallowValues?.includes(value)) {
    throw new Error(`${name} must not use an insecure default value`);
  }
  if (rules.minLength && value.length < rules.minLength) {
    throw new Error(`${name} must be at least ${rules.minLength} characters`);
  }
  if (rules.requireMixedCase && (!/[a-z]/.test(value) || !/[A-Z]/.test(value))) {
    throw new Error(`${name} must include both uppercase and lowercase letters`);
  }
  return value;
}

export function getAppPassword(): string {
  return getRequiredEnv("APP_PASSWORD", { disallowValues: ["change-me"], minLength: 8, requireMixedCase: true });
}

export function getAuthSecret(): string {
  return getRequiredEnv("AUTH_SECRET", {
    disallowValues: ["replace-with-at-least-32-random-characters"],
    minLength: 32
  });
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
