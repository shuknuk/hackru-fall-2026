import "server-only";
import { createHash } from "node:crypto";

export class DeviceAuthError extends Error {
  constructor(message: string) { super(message); }
}

export function requireDevice(request: Request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new DeviceAuthError("This phone has not enabled Tiger Data trends.");
  return createHash("sha256").update(match[1]).digest("hex");
}
