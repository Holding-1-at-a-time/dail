
import { v } from 'convex/values';
import { internalMutation, mutation, query, MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { rateLimiter } from './rateLimiter';
import { lowPriorityWorkflowManager } from './workflows';
import { Id } from './_generated/dataModel';

const getUserId = async (ctx: MutationCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }
    return identity.subject;
};

const requireAdmin = async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (!user || user.role !== 'admin') throw new Error("Not authorized");
    return user;
};

export const getData = query({
    handler: async (ctx) => {
        const promotions = await ctx.db.query('promotions').collect();
        const campaigns = await ctx.db.query('campaigns').order('desc').collect();
        return { promotions, campaigns };
    }
});

export const savePromotion = mutation({
    args: {
        id: v.optional(v.id('promotions')),
        data: v.object({
            code: v.string(),
            type: v.union(v.literal('percentage'), v.literal('fixedAmount')),
            value: v.number(),
            isActive: v.boolean(),
        })
    },
    handler: async (ctx, { id, data }) => {
        await requireAdmin(ctx);
        if (id) {
            await ctx.db.patch(id, data);
        } else {
            await ctx.db.insert('promotions', data);
        }
    }
});

export const deletePromotion = mutation({
    args: { id: v.id('promotions') },
    handler: async (ctx, { id }) => {
        await requireAdmin(ctx);
        await ctx.db.delete(id);
    }
});

export const saveCampaign = mutation({
    args: {
        id: v.optional(v.id('campaigns')),
        data: v.object({
            goal: v.string(),
            subject: v.optional(v.string()),
            body: v.optional(v.string()),
        })
    },
    handler: async (ctx, { id, data }) => {
        await requireAdmin(ctx);
        if (id) {
            // Standard edit for a campaign that's already been generated.
            await ctx.db.patch(id, { goal: data.goal, subject: data.subject, body: data.body });
        } else {
            const userId = await getUserId(ctx);
            await rateLimiter.limit(ctx, "heavyAI", { key: userId, throws: true });
            
            // New campaign: create a placeholder and kick off the resilient generation.
            const campaignId = await ctx.db.insert('campaigns', {
                goal: data.goal,
                createdAt: Date.now(),
                status: 'generating',
            });
            
            await lowPriorityWorkflowManager.start(ctx, internal.workflows.campaignGenerationWorkflow,
                { goal: data.goal },
                {
                    onComplete: internal.workflows.handleCampaignGenerationCompletion,
                    context: { campaignId }
                }
            );
        }
    }
});

export const sendCampaign = mutation({
    args: { campaignId: v.id('campaigns') },
    handler: async (ctx, { campaignId }) => {
        await requireAdmin(ctx);
        const campaign = await ctx.db.get(campaignId);
        if (!campaign || campaign.status !== 'complete') {
            throw new Error("Campaign is not ready to be sent.");
        }

        await ctx.db.patch(campaignId, { status: 'sending' });
        
        await lowPriorityWorkflowManager.start(ctx, internal.workflows.sendCampaignWorkflow,
            { campaignId },
            {
                onComplete: internal.workflows.handleCampaignSentCompletion,
                context: { campaignId }
            }
        );
    }
});
