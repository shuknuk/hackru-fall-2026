import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), deleteWorkout: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  AuthError: class AuthError extends Error { constructor(public status: number, message: string) { super(message); } },
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/db/workouts", () => ({ deleteWorkout: mocks.deleteWorkout }));
import { DELETE } from "./route";

describe("cloud workout deletion", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireUser.mockResolvedValue("user_A"); });
  it("deletes only through the verified Clerk owner", async () => {
    mocks.deleteWorkout.mockResolvedValue(true);
    const id = "10000000-0000-4000-8000-000000000001";
    const response = await DELETE(new Request(`http://localhost/api/workouts/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(mocks.deleteWorkout).toHaveBeenCalledWith("user_A", id);
  });
});
