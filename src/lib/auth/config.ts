export function hasClerkConfiguration() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") === true
    && process.env.CLERK_SECRET_KEY?.startsWith("sk_") === true;
}
