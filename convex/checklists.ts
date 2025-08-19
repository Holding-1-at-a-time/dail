import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { internal } from './_generated/api';

export const create = mutation({
    args: {
        name: v.string(),
        serviceId: v.id('services'),
        tasks: v.array(v.string()),
    },
    handler: async (ctx, args) => {
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
        return await ctx.db.patch(id, rest);
    }
});

export const remove = mutation({
    args: { id: v.id('checklists') },
    handler: async (ctx, { id }) => {
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