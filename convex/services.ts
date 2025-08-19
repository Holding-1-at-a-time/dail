import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query('services').collect();
    }
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        basePrice: v.number(),
        isPackage: v.boolean(),
        serviceIds: v.array(v.id('services')),
        isDealerPackage: v.boolean(),
        estimatedDurationHours: v.optional(v.number()),
        productsUsed: v.optional(v.array(v.object({
            productId: v.id('products'),
            quantity: v.number(),
        }))),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('services', args);
    }
});

export const update = mutation({
    args: {
        id: v.id('services'),
        name: v.string(),
        description: v.string(),
        basePrice: v.number(),
        isPackage: v.boolean(),
        serviceIds: v.array(v.id('services')),
        isDealerPackage: v.boolean(),
        estimatedDurationHours: v.optional(v.number()),
        productsUsed: v.optional(v.array(v.object({
            productId: v.id('products'),
            quantity: v.number(),
        }))),
    },
    handler: async (ctx, { id, ...rest }) => {
        return await ctx.db.patch(id, rest);
    }
});

export const remove = mutation({
    args: { id: v.id('services') },
    handler: async (ctx, { id }) => {
        // You might want to add logic here to check if the service is used in jobs
        return await ctx.db.delete(id);
    }
});

export const search = query({
    args: { query: v.string() },
    handler: async (ctx, { query }) => {
        if (!query) return [];
        return await ctx.db
            .query('services')
            .withSearchIndex('search_name', (q) => q.search('name', query))
            .collect();
    }
});