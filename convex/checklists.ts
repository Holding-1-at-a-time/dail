
import { v } from 'convex/values';
import { mutation } from './_generated/server';
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
        serviceId: v.id('services'),
        tasks: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        return await ctx.db.insert('checklists', args);
    }
});

export const update = mutation({
    args: {
        id: v.id('checklists'),
        name: v.string(),
        serviceId: v.id('services'),
        tasks: v.array(v.string()),
    },
    handler: async (ctx, { id, ...rest }) => {
        await requireAdmin(ctx);
        return await ctx.db.patch(id, rest);
    }
});

export const remove = mutation({
    args: { id: v.id('checklists') },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        const checklist = await ctx.db.get(id);
        if (!checklist) return;

        await ctx.db.delete(id);

        await ctx.runMutation(internal.auditLog.record, {
            action: "delete_checklist",
            details: {
                targetId: id,
                targetName: checklist.name,
            }
        });
    }
});
