import { v } from 'convex/values';
import { action, query, ActionCtx, mutation } from './_generated/server';
import { api } from './_generated/api';
import { Id } from './_generated/dataModel';
import { agent } from './agent';
import { rateLimiter } from './rateLimiter';

const getUserId = async (ctx: ActionCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }
    return identity.subject;
};

// Query to get messages for a given thread
export const getMessages = query({
    args: {
        threadId: v.id('threads'),
    },
    handler: async (ctx, { threadId }) => {
        const messages = await ctx.db
            .query('messages')
            .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
            .collect();
        return messages.map(({ role, content }) => ({
            role,
            content: content,
        }));
    },
});

// Action to send a message and get a response from the agent
export const sendMessage = action({
    args: {
        message: v.string(),
        threadId: v.optional(v.id('threads')),
    },
    handler: async (ctx, { message, threadId }) => {
        const userId = await getUserId(ctx);
        await rateLimiter.limit(ctx, "assistant", { key: userId, throws: true });

        let newThreadId: Id<'threads'>;

        if (threadId) {
            newThreadId = threadId;
        } else {
            newThreadId = await ctx.runMutation(api.agent.createThread);
        }

        await ctx.runMutation(api.agent.addMessage, {
            threadId: newThreadId,
            role: 'user',
            content: message,
        });

        await ctx.runMutation(api.agent.run, { threadId: newThreadId, maxSteps: 5 });

        return newThreadId;
    },
});