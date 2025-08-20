
import { v } from 'convex/values';
import { mutation, action, query } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

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
        const company = await ctx.db.query('company').first();
        if (!company) {
            throw new Error("Company profile not found.");
        }
        await ctx.db.patch(company._id, { logoStorageId: storageId });
    },
});

export const createStripeAccountSession = action({
    handler: async (ctx) => {
        // This is a placeholder for a real Stripe integration.
        // In a real application, you would use the Stripe Node.js library here
        // to create an account and an account session, then return the client_secret.
        // You would need to set STRIPE_SECRET_KEY in your Convex environment variables.
        console.log("Attempting to create Stripe account session (simulation).");
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        // ... Stripe API calls ...
        
        // Because we don't have real keys, this will fail on the client,
        // which is the expected behavior outlined in the UI component.
        throw new Error("Stripe backend not fully implemented. This is a simulation.");
    }
});