
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';

const requireAdmin = async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (!user || user.role !== 'admin') throw new Error("Not authorized");
    return user;
};

export const create = mutation({
    args: {
        name: v.string(),
        contactEmail: v.optional(v.string()),
        estimatedLeadTimeDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
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
        await requireAdmin(ctx);
        return await ctx.db.patch(id, rest);
    }
});

export const remove = mutation({
    args: { id: v.id('suppliers') },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        const supplier = await ctx.db.get(id);
        if (!supplier) return;

        const productsFromSupplier = await ctx.db
            .query('products')
            .filter(q => q.eq(q.field('supplierId'), id))
            .first();

        if (productsFromSupplier) {
            throw new Error("Cannot delete supplier with associated products. Please reassign or delete the products first.");
        }
        
        await ctx.db.delete(id);

        await ctx.runMutation(internal.auditLog.record, {
            action: "delete_supplier",
            details: {
                targetId: id,
                targetName: supplier.name,
            }
        });
    }
});
