import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "./_generated/api";

// Initialize the action retrier with custom backoff settings.
// This instance can be used throughout the backend to run actions resiliently.
export const retrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 500,
  maxFailures: 3,
});