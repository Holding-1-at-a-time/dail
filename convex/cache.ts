import { ActionCache } from "@convex-dev/action-cache";
import { components, internal } from "./_generated/api";

// Cache for AI-generated service descriptions, valid for 7 days.
export const serviceDescriptionCache = new ActionCache(components.actionCache, {
  action: internal.ai.internalGenerateServiceDescription,
  name: "service-descriptions-v1",
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
});

// Cache for answers from the RAG knowledge base, valid for 1 day.
export const ragQuestionCache = new ActionCache(components.actionCache, {
    action: internal.rag.internalAskQuestion,
    name: "rag-questions-v1",
    ttl: 1000 * 60 * 60 * 24, // 1 day
});

// Cache for AI-generated product attributes, valid for 7 days.
export const productAttributeCache = new ActionCache(components.actionCache, {
  action: internal.ai.internalSuggestProductAttributes,
  name: "product-attributes-v1",
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
});

// Cache for AI-suggested products for a service, valid for 1 day.
export const productSuggestionCache = new ActionCache(components.actionCache, {
  action: internal.ai.internalSuggestProductsForService,
  name: "product-suggestions-v1",
  ttl: 1000 * 60 * 60 * 24, // 1 day
});
