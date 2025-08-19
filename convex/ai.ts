import { GoogleGenAI, Type } from "@google/genai";
import { v } from "convex/values";
import { action, internalAction, internalQuery, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { productAttributeCache, productSuggestionCache, serviceDescriptionCache } from "./cache";
import { rateLimiter } from "./rateLimiter";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const getUserId = async (ctx: ActionCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
};

// --- Service Description Generation ---
export const generateServiceDescription = action({
  args: { serviceName: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getUserId(ctx);
    await rateLimiter.limit(ctx, "generalAI", { key: userId, throws: true });
    return await serviceDescriptionCache.fetch(ctx, args);
  },
});

export const internalGenerateServiceDescription = internalAction({
  args: { serviceName: v.string() },
  handler: async (ctx, { serviceName }): Promise<string> => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a compelling, customer-facing description for an auto detailing service named "${serviceName}". Keep it concise (2-3 sentences) and highlight the key benefits.`,
    });
    return response.text;
  },
});

// --- Appointment Scheduling ---
export const suggestAppointmentSlots = action({
    args: { jobId: v.id('jobs') },
    handler: async (ctx, { jobId }) => {
        const userId = await getUserId(ctx);
        await rateLimiter.limit(ctx, "generalAI", { key: userId, throws: true });

        const job = await ctx.runQuery(api.jobs.get, { id: jobId });
        const allAppointments = await ctx.runQuery(api.appointments.getAll);
        const allServices = await ctx.runQuery(api.services.getAll);
        if (!job || !allAppointments || !allServices) return null;

        const jobDurationHours = job.jobItems.reduce((total, item) => {
            const service = allServices.find(s => s._id === item.serviceId);
            return total + (service?.estimatedDurationHours || 2);
        }, 0);

        const prompt = `I need to schedule a new detailing job that will take approximately ${jobDurationHours} hours.
        My typical business hours are Monday-Friday 9am to 5pm.
        
        Here is a list of my currently scheduled appointments in UTC timestamps:
        ${JSON.stringify(allAppointments.map(a => ({ start: a.startTime, end: a.endTime})))}

        Based on this, suggest three optimal, non-overlapping appointment slots for the new job in the near future (within the next two weeks). Provide the start and end times for each slot.
        
        Respond ONLY with a JSON array of objects, where each object has "startTime" and "endTime" as ISO 8601 strings. Do not include any other text or explanation.
        Example: [{"startTime": "2024-08-15T13:00:00.000Z", "endTime": "2024-08-15T17:00:00.000Z"}]
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text);
    }
});

// --- Smart Inventory ---
export const suggestProductAttributes = action({
  args: { productName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    await rateLimiter.limit(ctx, "generalAI", { key: userId, throws: true });
    return productAttributeCache.fetch(ctx, args);
  },
});

export const internalSuggestProductAttributes = internalAction({
  args: { productName: v.string() },
  handler: async (_, { productName }) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `For the auto detailing product "${productName}", suggest a category and a common unit of measurement.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: 'e.g., "Chemicals", "Pads", "Tools"' },
            unit: { type: Type.STRING, description: 'e.g., "bottle", "gallon", "unit", "pack"' },
          },
        },
      },
    });
    return JSON.parse(response.text);
  },
});

export const suggestProductsForService = action({
    args: { serviceName: v.string(), serviceDescription: v.string() },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        await rateLimiter.limit(ctx, "generalAI", { key: userId, throws: true });
        return productSuggestionCache.fetch(ctx, args);
    },
});

export const internalSuggestProductsForService = internalAction({
    args: { serviceName: v.string(), serviceDescription: v.string() },
    handler: async (ctx, { serviceName, serviceDescription }) => {
        const allProducts = await ctx.runQuery(internal.ai.getAllProducts);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Given the service "${serviceName}" (Description: "${serviceDescription}"), which of the following products are likely to be used?
          
          Available Products:
          ${JSON.stringify(allProducts.map(p => ({ id: p._id, name: p.name, category: p.category})))}
          `,
          config: {
             responseMimeType: "application/json",
             responseSchema: {
                type: Type.OBJECT,
                properties: {
                    productIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    }
                }
             }
          }
        });
        const result = JSON.parse(response.text);
        return (result.productIds || []) as Id<'products'>[];
    }
});

export const generateReorderSuggestion = internalAction({
    args: {
        productName: v.string(),
        stockLevel: v.number(),
        supplierName: v.string(),
        leadTimeDays: v.optional(v.number()),
    },
    handler: async (_, { productName, stockLevel, supplierName, leadTimeDays }) => {
        const leadTimeInfo = leadTimeDays 
            ? `The supplier, ${supplierName}, has an estimated lead time of ${leadTimeDays} days.`
            : `The supplier is ${supplierName}.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The product "${productName}" is low on stock, with only ${stockLevel} units remaining. ${leadTimeInfo} Generate a concise, helpful reorder suggestion. Be direct and actionable.`,
        });
        return response.text;
    }
});

export const getAllProducts = internalQuery({
    handler: (ctx) => ctx.db.query('products').collect(),
});