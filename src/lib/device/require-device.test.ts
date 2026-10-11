import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requireDevice } from "./require-device";
describe("phone credentials", () => {
  it("rejects missing credentials and derives distinct opaque scopes", () => {
    expect(() => requireDevice(new Request("https://example.com"))).toThrow();
    const request = (token: string) => new Request("https://example.com", { headers: { authorization: `Bearer ${token}` } });
    const first = requireDevice(request("a".repeat(43)));
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(requireDevice(request("a".repeat(43))));
    expect(first).not.toBe(requireDevice(request("b".repeat(43))));
    expect(() => requireDevice(request("short"))).toThrow();
  });
});
