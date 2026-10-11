import { auth } from "@clerk/nextjs/server";
import { hasClerkConfiguration } from "./config";

export class AuthError extends Error {
  constructor(public status: 401 | 503, message: string) { super(message); }
}
export async function requireUser() {
  if (!hasClerkConfiguration())
    throw new AuthError(503, "Account services are not configured.");
  const { userId } = await auth();
  if (!userId) throw new AuthError(401, "Sign in is required.");
  return userId;
}
