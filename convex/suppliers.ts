import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const create = mutation({
    args: {
        name: v.string(),
        contactEmail: v.optional(v.string()),
        estimatedLeadTimeDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('suppliers', args);
    }
});

export const update = mutation({
    args: {
        id: v.id('suppliers'),
        name: v.string(),
        contactEmail: v.optional(v.string()),
        estimatedLeadTimeDays: v.optional(v.number()),
    },
    handler: async (ctx, { id, ...rest }) => {
        return await ctx.db.patch(id, rest);
    }
});

export const remove = mutation({
    args: { id: v.id('suppliers') },
    handler: async (ctx, { id }) => {
        const productsFromSupplier = await ctx.db
            .query('products')
            .filter(q => q.eq(q.field('supplierId'), id))
            .first();

        if (productsFromSupplier) {
            throw new Error("Cannot delete supplier with associated products. Please reassign or delete the products first.");
        }
        
        return await ctx.db.delete(id);
    }
});