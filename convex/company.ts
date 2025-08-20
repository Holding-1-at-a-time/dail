

import { v } from 'convex/values';
import { mutation, action, query, internalMutation, ActionCtx } from './_generated/server';
import { api, internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20' as Stripe.StripeConfig['apiVersion'],
});

const requireAdmin = async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (!user || user.role !== 'admin') throw new Error("Not authorized");
    return user;
};

const requireAdminAction = async (ctx: ActionCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByIdentity);
    if (!user || user.role !== 'admin') throw new Error("Not authorized");
    return user;
};


export const get = query({
    handler: async (ctx) => {
        return await ctx.db.query('company').first();
    }
});

export const save = mutation({
    args: {
        id: v.id('company'),
        name: v.string(),
        defaultLaborRate: v.number(),
        enableSmartInventory: v.boolean(),
        brandColor: v.optional(v.string()),
        businessHours: v.optional(v.object({
            monday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            tuesday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            wednesday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            thursday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            friday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            saturday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
            sunday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        })),
        bookingLeadTimeDays: v.optional(v.number()),
        slotDurationMinutes: v.optional(v.number()),
        enableEmailReminders: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...rest }) => {
        await requireAdmin(ctx);
        await ctx.db.patch(id, rest);
        
        await ctx.runMutation(internal.auditLog.record, {
            action: "update_company_settings",
            details: {
                targetId: id,
                targetName: rest.name,
            }
        });
    }
});

export const setLogo = mutation({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, { storageId }) => {
        await requireAdmin(ctx);
        const company = await ctx.db.query('company').first();
        if (!company) {
            throw new Error("Company profile not found.");
        }
        await ctx.db.patch(company._id, { logoStorageId: storageId });
    },
});

export const createStripeConnectAccount = action({
    handler: async (ctx) => {
        await requireAdminAction(ctx);
        const company = await ctx.runQuery(api.company.get);
        if (!company) throw new Error("Company profile not found.");

        let accountId = company.stripeAccountId;

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                business_type: 'individual', // Can be customized further
            });
            accountId = account.id;
            await ctx.runMutation(internal.company.setStripeAccountId, { 
                companyId: company._id, 
                stripeAccountId: accountId 
            });
        }
        
        const origin = new URL(process.env.VITE_CONVEX_URL!).origin;
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/`,
            return_url: `${origin}/`,
            type: 'account_onboarding',
        });

        return accountLink.url;
    }
});

export const createStripeDashboardLink = action({
    handler: async (ctx) => {
        await requireAdminAction(ctx);
        const company = await ctx.runQuery(api.company.get);
        if (!company?.stripeAccountId || company.stripeConnectStatus !== 'complete') {
            throw new Error("Stripe account not fully connected.");
        }

        const loginLink = await stripe.accounts.createLoginLink(company.stripeAccountId);
        return loginLink.url;
    }
});

export const setStripeAccountId = internalMutation({
    args: { companyId: v.id('company'), stripeAccountId: v.string() },
    handler: async (ctx, { companyId, stripeAccountId }) => {
        await ctx.db.patch(companyId, { 
            stripeAccountId,
            stripeConnectStatus: 'in_progress',
        });
    }
});

export const completeOnboarding = mutation({
    args: {
        name: v.string(),
        defaultLaborRate: v.number(),
    },
    handler: async (ctx, { name, defaultLaborRate }) => {
        await requireAdmin(ctx);
        const company = await ctx.db.query('company').first();
        if (!company) {
            throw new Error("Company profile not found.");
        }
        await ctx.db.patch(company._id, {
            name,
            defaultLaborRate,
            onboardingCompleted: true,
        });

        await ctx.runMutation(internal.auditLog.record, {
            action: "complete_onboarding",
            details: { targetId: company._id, targetName: name }
        });
    }
});