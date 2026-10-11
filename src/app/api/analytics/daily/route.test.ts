import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), dailyAnalytics: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  AuthError: class AuthError extends Error { constructor(public status: number, message: string) { super(message); } },
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/db/analytics", () => ({ dailyAnalytics: mocks.dailyAnalytics }));
import { GET } from "./route";

describe("daily Tiger Data analytics", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireUser.mockResolvedValue("user_A"); });
  it("scopes the bounded UTC aggregation to the verified user", async () => {
    mocks.dailyAnalytics.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/analytics/daily?days=7"));
    expect(response.status).toBe(200);
    expect(mocks.dailyAnalytics).toHaveBeenCalledWith("user_A", 7);
    expect(await response.json()).toEqual({ days: [], timezone: "UTC" });
  });
});
