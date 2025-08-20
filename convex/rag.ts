import { api, internal } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { assert } from "convex-helpers";
import { ragQuestionCache } from "./cache";
import { rateLimiter } from "./rateLimiter";
import { Workpool } from "@convex-dev/workpool";
import { cosineSimilarity } from "../utils/vector";

const getUserId = async (ctx: ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
};

const textEmbeddingModel = openai.embedding("text-embedding-3-small");

export const rag = new RAG(api.rag, {
  textEmbeddingModel: textEmbeddingModel,
  embeddingDimension: 1536, // Needs to match your embedding model
});

// Workpool for RAG ingestion to control concurrency and add retries.
export const ragWorkpool = new Workpool(api.ragWorkpool, {
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
            chunkerAction: internal.rag.semanticChunkerAction,
            metadata: { storageId },
            title: originalFilename,
        });
    }
});

// Advanced Semantic Chunker
export const semanticChunkerAction = rag.defineChunkerAction(async (ctx, args) => {
  const storageIdValue = args.entry.metadata!.storageId;
  assert(typeof storageIdValue === "string", `storageId must be a string, but was ${typeof storageIdValue}`);
  const storageId = storageIdValue as Id<"_storage">;

  const file = await ctx.storage.get(storageId);
  if (!file) {
    throw new Error(`File not found for storageId: ${storageId}`);
  }
  const text = await file.text();
  
  // 1. Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) return { chunks: [] };

  // 2. Embed all sentences
  const { embeddings } = await textEmbeddingModel.doEmbed({ values: sentences });

  // 3. Group sentences into semantic chunks
  const chunks: string[] = [];
  let currentChunk: string[] = [sentences[0]];
  const similarityThreshold = 0.8;

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);
    if (similarity > similarityThreshold) {
      currentChunk.push(sentences[i]);
    } else {
      chunks.push(currentChunk.join(" ").trim());
      currentChunk = [sentences[i]];
    }
  }
  chunks.push(currentChunk.join(" ").trim());

  return { chunks };
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

// The core logic, now an internal action with an advanced pipeline.
export const internalAskQuestion = internalAction({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ answer: string; context: any }> => {
    const namespace = "globalKnowledgeBase";

    // 1. AI-Powered Query Expansion
    const expansionPrompt = `The user is asking: "${args.prompt}". Generate 3 alternative ways of asking this question to improve search results. Respond ONLY with a JSON array of strings.`;
    const expansionResponse = await openai.chat("gpt-4o-mini").doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: expansionPrompt }] }],
      mode: { type: 'json-object' }
    });
    
    let expandedQueries = [args.prompt];
    try {
        const parsed = expansionResponse.object as unknown;
        if (Array.isArray(parsed)) {
            expandedQueries.push(...parsed.filter((q): q is string => typeof q === 'string'));
        }
    } catch (e) { console.error("Failed to parse query expansion", e); }

    // 2. Initial Retrieval (Recall)
    const searchResults = await Promise.all(
        expandedQueries.map(q => rag.search(ctx, { namespace, query: q, limit: 5 }))
    );
    const uniqueEntries = new Map(searchResults.flatMap(r => r.results).map(r => [r.entryId, r]));

    if (uniqueEntries.size === 0) {
      return { answer: "I couldn't find any relevant information in the knowledge base to answer your question.", context: { entries: [] } };
    }

    // 3. Cross-Encoder Re-ranking
    const rerankPrompt = `Original Question: "${args.prompt}"
    
    Candidate Chunks:
    ${Array.from(uniqueEntries.values()).map((entry, idx) => `[${idx}] ${entry.content.map(c => c.text).join(" ")}`).join("\n\n")}
    
    Based on the original question, which chunks are most relevant? Respond ONLY with a JSON object containing a key "ranked_indices" with an array of the indices of the top 3 most relevant chunks, in order of relevance. For example: {"ranked_indices": [2, 0, 4]}`;
    
    const rerankResponse = await openai.chat("gpt-4o-mini").doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: rerankPrompt }] }],
        mode: { type: 'json-object' }
    });

    let topEntries = Array.from(uniqueEntries.values()).slice(0, 3);
    try {
        const rankedResult = rerankResponse.object as { ranked_indices?: number[] };
        if (rankedResult.ranked_indices && Array.isArray(rankedResult.ranked_indices)) {
            const allEntries = Array.from(uniqueEntries.values());
            topEntries = rankedResult.ranked_indices.map((idx: number) => allEntries[idx]).filter(Boolean);
        }
    } catch(e) { console.error("Failed to parse re-ranking response", e); }


    // 4. Final Generation
    const context = { namespace, results: topEntries };
    const { text } = await rag.generateText(ctx, {
        search: context, // Use the re-ranked context
        prompt: args.prompt,
        model: openai.chat("gpt-4o-mini"),
    });

    return { answer: text, context };
  },
});