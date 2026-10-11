import { afterEach, describe, expect, it } from "vitest";
import { hasClerkConfiguration } from "./config";

const originalPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const originalSecretKey = process.env.CLERK_SECRET_KEY;
afterEach(() => {
  if (originalPublishableKey === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublishableKey;
  if (originalSecretKey === undefined) delete process.env.CLERK_SECRET_KEY;
  else process.env.CLERK_SECRET_KEY = originalSecretKey;
});

describe("hasClerkConfiguration", () => {
  it("accepts only a complete Clerk key pair", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";
    process.env.CLERK_SECRET_KEY = "sk_test_example";
    expect(hasClerkConfiguration()).toBe(true);
    process.env.CLERK_SECRET_KEY = "disabled";
    expect(hasClerkConfiguration()).toBe(false);
  });
});
