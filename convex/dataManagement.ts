import { action, internalMutation, query } from './_generated/server';
import { api, internal } from './_generated/api';
import { v } from 'convex/values';

export const listSnapshots = query({
    handler: async (ctx) => {
        return await ctx.db.query('snapshots').withIndex('by_timestamp').order('desc').take(10);
    }
});

export const createSnapshot = action({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }
        const user = await ctx.runQuery(api.users.getByIdentity);
        if (user?.role !== 'admin') {
            throw new Error("Not authorized");
        }

        const snapshotName = `Manual Snapshot - ${new Date().toISOString()}`;
        
        await ctx.runMutation(internal.dataManagement.recordSnapshot, {
            name: snapshotName,
            createdBy: user.name,
        });

        return { success: true, name: snapshotName };
    }
});

export const recordSnapshot = internalMutation({
    args: { name: v.string(), createdBy: v.string() },
    handler: async (ctx, { name, createdBy }) => {
        await ctx.db.insert('snapshots', {
            name,
            createdBy,
            timestamp: Date.now(),
        });
    }
});