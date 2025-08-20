import Stripe from 'stripe';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery } from './_generated/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

export const handleWebhook = internalAction({
    args: { signature: v.string(), payload: v.string() },
    handler: async (ctx, { signature, payload }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        try {
            const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            
            switch(event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    const jobId = paymentIntent.metadata.jobId;
                    if (!jobId) {
                        throw new Error("Job ID missing from payment intent metadata");
                    }
                    
                    await ctx.runMutation(internal.jobs.internalSavePayment, {
                        jobId: jobId as any,
                        payment: {
                            amount: paymentIntent.amount,
                            paymentDate: paymentIntent.created * 1000,
                            method: 'Credit Card',
                            notes: `Stripe Charge ID: ${paymentIntent.latest_charge}`,
                        },
                    });
                    break;
                case 'account.updated':
                    const account = event.data.object;
                    const company = await ctx.runQuery(internal.stripe.getCompanyByStripeId, { stripeAccountId: account.id });
                    if (company) {
                        let status: 'in_progress' | 'complete' | 'needs_attention' = 'in_progress';
                        if (account.charges_enabled) {
                            status = 'complete';
                        } else if (account.requirements?.currently_due.length > 0) {
                            status = 'needs_attention';
                        }
                        await ctx.runMutation(internal.stripe.updateCompanyStripeStatus, { companyId: company._id, status });
                    }
                    break;
                // ... handle other event types
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return { success: true };
        } catch (err: any) {
            console.error(`Stripe webhook error: ${err.message}`);
            return { success: false, error: err.message };
        }
    },
});

export const getCompanyByStripeId = internalQuery({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, { stripeAccountId }) => {
        return await ctx.db
            .query('company')
            .filter(q => q.eq(q.field('stripeAccountId'), stripeAccountId))
            .first();
    }
});

export const updateCompanyStripeStatus = internalMutation({
    args: {
        companyId: v.id('company'),
        status: v.union(v.literal('in_progress'), v.literal('complete'), v.literal('needs_attention')),
    },
    handler: async (ctx, { companyId, status }) => {
        await ctx.db.patch(companyId, { stripeConnectStatus: status });
    }
});