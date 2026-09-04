import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "gremio_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedPassword: string) {
  const [algorithm, salt, key] = storedPassword.split(":");
  if (algorithm !== "scrypt" || !salt || !key) return false;

  const expected = Buffer.from(key, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createSession(usuarioId: string) {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.sesion.create({
    data: { tokenHash: hashSessionToken(token), usuarioId, expira },
  });

  return { token, expira };
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.sesion.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { usuario: true },
  });

  if (!session) return null;
  if (session.expira <= new Date()) {
    await prisma.sesion.delete({ where: { id: session.id } });
    return null;
  }

  return session.usuario;
}

export function setSessionCookie(response: Response, token: string, expira: Date) {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    `Expires=${expira.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  response.headers.append("Set-Cookie", attributes.join("; "));
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
  );
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await prisma.sesion.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}