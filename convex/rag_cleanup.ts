import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./rag.js";
import { assert } from "convex-helpers";
import { internal } from "./_generated/api.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const deleteOldContent = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const toDelete = await rag.list(ctx, {
      status: "replaced",
      paginationOpts: { cursor: args.cursor ?? null, numItems: 100 },
    });

    for (const entry of toDelete.page) {
      assert(entry.status === "replaced");
      // Only delete if it was replaced over a week ago
      if (entry.replacedAt >= Date.now() - WEEK) {
        return; 
      }
      await rag.delete(ctx, { entryId: entry.entryId });
    }
    if (!toDelete.isDone) {
      await ctx.scheduler.runAfter(0, internal.rag_cleanup.deleteOldContent, {
        cursor: toDelete.continueCursor,
      });
    }
  },
});
