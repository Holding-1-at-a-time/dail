import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// --- Pricing Matrices ---

export const createMatrix = mutation({
    args: {
        name: v.string(),
        appliesToServiceIds: v.array(v.id('services')),
        rules: v.array(v.object({
            id: v.string(),
            factor: v.string(),
            adjustmentType: v.union(v.literal('percentage'), v.literal('fixedAmount')),
            adjustmentValue: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('pricingMatrices', args);
    }
});

export const updateMatrix = mutation({
    args: {
        id: v.id('pricingMatrices'),
        name: v.string(),
        appliesToServiceIds: v.array(v.id('services')),
        rules: v.array(v.object({
            id: v.string(),
            factor: v.string(),
            adjustmentType: v.union(v.literal('percentage'), v.literal('fixedAmount')),
            adjustmentValue: v.number(),
        })),
    },
    handler: async (ctx, { id, ...rest }) => {
        return await ctx.db.patch(id, rest);
    }
});

export const deleteMatrix = mutation({
    args: { id: v.id('pricingMatrices') },
    handler: async (ctx, { id }) => {
        return await ctx.db.delete(id);
    }
});

// --- Upcharges ---

export const createUpcharge = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        defaultAmount: v.number(),
        isPercentage: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('upcharges', args);
    }
});

export const updateUpcharge = mutation({
    args: {
        id: v.id('upcharges'),
        name: v.string(),
        description: v.string(),
        defaultAmount: v.number(),
        isPercentage: v.boolean(),
    },
    handler: async (ctx, { id, ...rest }) => {
        return await ctx.db.patch(id, rest);
    }
});

export const deleteUpcharge = mutation({
    args: { id: v.id('upcharges') },
    handler: async (ctx, { id }) => {
        return await ctx.db.delete(id);
    }
});

export const getAllUpcharges = query({
    handler: async (ctx) => {
        return await ctx.db.query('upcharges').collect();
    }
});
