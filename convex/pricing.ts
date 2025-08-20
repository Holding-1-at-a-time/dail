
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
        await requireAdmin(ctx);
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
        await requireAdmin(ctx);
        return await ctx.db.patch(id, rest);
    }
});

export const deleteMatrix = mutation({
    args: { id: v.id('pricingMatrices') },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        const matrix = await ctx.db.get(id);
        if (!matrix) return;

        await ctx.db.delete(id);
        
        await ctx.runMutation(internal.auditLog.record, {
            action: "delete_pricing_matrix",
            details: {
                targetId: id,
                targetName: matrix.name,
            }
        });
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
        await requireAdmin(ctx);
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
        await requireAdmin(ctx);
        return await ctx.db.patch(id, rest);
    }
});

export const deleteUpcharge = mutation({
    args: { id: v.id('upcharges') },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        const upcharge = await ctx.db.get(id);
        if (!upcharge) return;
        
        await ctx.db.delete(id);
        
        await ctx.runMutation(internal.auditLog.record, {
            action: "delete_upcharge",
            details: {
                targetId: id,
                targetName: upcharge.name,
            }
        });
    }
});

export const getAllUpcharges = query({
    handler: async (ctx) => {
        return await ctx.db.query('upcharges').collect();
    }
});
