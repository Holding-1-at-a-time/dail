import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';

export const getLogs = query({
    args: {
        search: v.optional(v.string()),
    },
    handler: async (ctx, { search }) => {
        let logs = await ctx.db.query('auditLogs').withIndex('by_timestamp').order('desc').collect();
        if (search) {
            const lowerCaseSearch = search.toLowerCase();
            logs = logs.filter(log =>
                log.userName.toLowerCase().includes(lowerCaseSearch) ||
                log.action.toLowerCase().includes(lowerCaseSearch) ||
                log.details.targetName?.toLowerCase().includes(lowerCaseSearch)
            );
        }
        return logs;
    }
});

export const record = internalMutation({
    args: {
        action: v.string(),
        details: v.object({
            targetId: v.optional(v.string()),
            targetName: v.optional(v.string()),
            extra: v.optional(v.any()),
        }),
    },
    handler: async (ctx, { action, details }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            console.error("Audit log attempted without authenticated user.");
            return;
        }
        const user = await ctx.db.query('users').withIndex('by_clerk_id', q => q.eq("clerkId", identity.subject)).unique();
        if (!user) {
            console.error(`Audit log attempted for user not in DB: ${identity.subject}`);
            return;
        }

        await ctx.db.insert('auditLogs', {
            userId: user._id,
            userName: user.name,
            action,
            details,
            timestamp: Date.now(),
        });
    }
});