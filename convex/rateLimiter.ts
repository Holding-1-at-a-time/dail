import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components, api } from "./_generated/api";
import { QueryCtx } from "./_generated/server";

// Helper to get the user ID for per-user rate limiting.
const getUserId = async (ctx: { auth: { getUserIdentity: () => Promise<any | null> } }) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Rate limiting requires authentication.");
  }
  return identity.subject;
};

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Public booking form: 10 bookings per hour, global.
  publicBooking: { kind: "fixed window", rate: 10, period: HOUR },

  // General AI features: 30 requests per minute per user.
  generalAI: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 5 },

  // AI Assistant chat: A bit stricter to prevent spam, 15 messages per minute.
  assistant: { kind: "token bucket", rate: 15, period: MINUTE, capacity: 3 },

  // Expensive AI tasks (visual quote, campaign gen): 5 per hour per user.
  heavyAI: { kind: "token bucket", rate: 5, period: HOUR, capacity: 1 },
});

// Export the React hook API for the assistant chat
export const { getRateLimit, getServerTime } = rateLimiter.hookAPI(
  "assistant",
  { key: async (ctx) => getUserId(ctx as QueryCtx) }
);