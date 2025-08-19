import { components, internal } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { assert } from "convex-helpers";
import { ragQuestionCache } from "./cache";
import { rateLimiter } from "./rateLimiter";
import { Workpool } from "@convex-dev/workpool";

const getUserId = async (ctx: ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
};

export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536, // Needs to match your embedding model
});

// Workpool for RAG ingestion to control concurrency and add retries.
export const ragWorkpool = new Workpool(components.ragWorkpool, {
  maxParallelism: 3, // Process up to 3 documents at a time.
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 5, initialBackoffMs: 1000, base: 2 },
});

// Internal action to be run by the workpool for processing a single document.
export const processDocument = internalAction({
    args: {
        storageId: v.id("_storage"),
        originalFilename: v.string(),
    },
    handler: async (ctx, { storageId, originalFilename }) => {
        await rag.addAsync(ctx, {
            namespace: "globalKnowledgeBase",
            key: `file-${storageId}`,
            chunkerAction: internal.rag.chunkerAction,
            metadata: { storageId },
            title: originalFilename,
        });
    }
});

export const chunkerAction = rag.defineChunkerAction(async (ctx, args) => {
  const storageIdValue = args.entry.metadata!.storageId;
  assert(typeof storageIdValue === "string", `storageId must be a string, but was ${typeof storageIdValue}`);
  const storageId = storageIdValue as Id<"_storage">;

  const file = await ctx.storage.get(storageId);
  if (!file) {
    throw new Error(`File not found for storageId: ${storageId}`);
  }
  const text = await file.text();
  return { chunks: text.split("\n\n") }; // Simple chunking by paragraph
});

// The public-facing action that uses the cache.
export const askQuestion = action({
    args: {
        prompt: v.string(),
    },
    handler: async (ctx, args): Promise<{ answer: string; context: any }> => {
        const userId = await getUserId(ctx);
        await rateLimiter.limit(ctx, "generalAI", { key: userId, throws: true });
        return await ragQuestionCache.fetch(ctx, args);
    }
});

// The core logic, now an internal action.
export const internalAskQuestion = internalAction({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ answer: string; context: any }> => {
    // We'll use a single global namespace for simplicity in this app.
    const namespace = "globalKnowledgeBase";
    const { text, context } = await rag.generateText(ctx, {
      search: { namespace, limit: 5 },
      prompt: args.prompt,
      model: openai.chat("gpt-4o-mini"),
    });
    return { answer: text, context };
  },
});