import { v } from 'convex/values';
import { internalAction, mutation, query, internalQuery, internalMutation } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query('subscriptions').order('desc').collect();
    }
});

export const save = mutation({
    args: {
        id: v.optional(v.id('subscriptions')),
        data: v.object({
            customerId: v.id('customers'),
            serviceIds: v.array(v.id('services')),
            frequency: v.union(v.literal('weekly'), v.literal('biweekly'), v.literal('monthly'), v.literal('quarterly'), v.literal('yearly')),
            price: v.number(),
            startDate: v.number(),
        })
    },
    handler: async (ctx, { id, data }) => {
        if (id) {
            await ctx.db.patch(id, { ...data });
        } else {
            await ctx.db.insert('subscriptions', {
                ...data,
                status: 'active',
                nextDueDate: data.startDate, // First job is on the start date
            });
        }
    }
});

export const updateStatus = mutation({
    args: {
        id: v.id('subscriptions'),
        status: v.union(v.literal('active'), v.literal('paused'), v.literal('cancelled')),
    },
    handler: async (ctx, { id, status }) => {
        await ctx.db.patch(id, { status });

        if (status === 'cancelled') {
            const subscription = await ctx.db.get(id);
            if (subscription) {
                const customer = await ctx.db.get(subscription.customerId);
                await ctx.runMutation(internal.auditLog.record, {
                    action: "cancel_subscription",
                    details: {
                        targetId: id,
                        targetName: `Subscription for ${customer?.name || 'Unknown'}`,
                    }
                });
            }
        }
    }
});

// --- Internal Functions for Recurring Job Generation ---

export const getDueSubscriptions = internalQuery(async ({ db }) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayTimestamp = now.getTime();
    return await db
        .query('subscriptions')
        .withIndex('by_next_due_date', q => q.lte('nextDueDate', todayTimestamp))
        .filter(q => q.eq(q.field('status'), 'active'))
        .collect();
});

export const getFirstVehicleForCustomer = internalQuery(async ({ db }, { customerId }: { customerId: Id<'customers'> }) => {
    return db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', customerId)).first();
});

export const getServicesForSubscription = internalQuery(async ({ db }, { serviceIds }: { serviceIds: Id<'services'>[] }) => {
    return await Promise.all(serviceIds.map(id => db.get(id)));
});

export const createJobFromSubscription = internalMutation(async ({ db }, args: any) => {
    return await db.insert('jobs', args);
});

export const createAppointmentForJob = internalMutation(async ({ db }, args: any) => {
    await db.insert('appointments', args);
});

export const updateSubscriptionDueDate = internalMutation(async ({ db }, { id, nextDueDate }: { id: Id<'subscriptions'>, nextDueDate: number }) => {
    await db.patch(id, { nextDueDate });
});

export const generateRecurringJobs = internalAction({
    handler: async (ctx) => {
        const dueSubscriptions = await ctx.runQuery(internal.subscriptions.getDueSubscriptions);

        if (dueSubscriptions.length === 0) {
            console.log("No recurring jobs to generate today.");
            return;
        }

        for (const sub of dueSubscriptions) {
            const vehicle = await ctx.runQuery(internal.subscriptions.getFirstVehicleForCustomer, { customerId: sub.customerId });
            if (!vehicle) {
                console.warn(`Skipping job for subscription ${sub._id} as customer has no vehicles.`);
                continue;
            }

            const services = await ctx.runQuery(internal.subscriptions.getServicesForSubscription, { serviceIds: sub.serviceIds });
            const jobItems = services.filter(Boolean).map(service => ({
                id: `item_${Date.now()}_${service!._id}`,
                serviceId: service!._id,
                quantity: 1,
                unitPrice: service!.basePrice,
                appliedPricingRuleIds: [],
                addedUpchargeIds: [],
                total: service!.basePrice,
            }));

            const jobId = await ctx.runMutation(internal.subscriptions.createJobFromSubscription, {
                customerId: sub.customerId,
                vehicleId: vehicle._id,
                status: 'workOrder' as const,
                estimateDate: Date.now(),
                workOrderDate: Date.now(),
                totalAmount: sub.price,
                paymentReceived: 0,
                paymentStatus: 'unpaid' as const,
                jobItems: jobItems,
                customerApprovalStatus: 'approved' as const,
                notes: `Generated from ${sub.frequency} subscription.`,
                inventoryDebited: false
            });
            
            const appointmentTime = new Date(sub.nextDueDate);
            appointmentTime.setHours(9, 0, 0, 0);

            await ctx.runMutation(internal.subscriptions.createAppointmentForJob, {
                jobId,
                startTime: appointmentTime.getTime(),
                endTime: appointmentTime.getTime() + 2 * 60 * 60 * 1000, // Placeholder 2hr duration
                status: 'scheduled' as const,
                description: "Recurring Service",
            });
            
            const nextDueDate = new Date(sub.nextDueDate);
            switch (sub.frequency) {
                case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'biweekly': nextDueDate.setDate(nextDueDate.getDate() + 14); break;
                case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                case 'quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
                case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
            }
            
            await ctx.runMutation(internal.subscriptions.updateSubscriptionDueDate, { id: sub._id, nextDueDate: nextDueDate.getTime() });

            console.log(`Generated job ${jobId} for subscription ${sub._id}`);
        }
    }
});