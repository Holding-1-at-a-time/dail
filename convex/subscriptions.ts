import { v } from 'convex/values';
import { internalAction, mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

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
    }
});

export const generateRecurringJobs = internalAction({
    handler: async (ctx) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayTimestamp = now.getTime();

        const dueSubscriptions = await ctx.runQuery(query(async ({ db }) => {
            return await db
                .query('subscriptions')
                .withIndex('by_next_due_date', q => q.lte('nextDueDate', todayTimestamp))
                .filter(q => q.eq(q.field('status'), 'active'))
                .collect();
        }));

        if (dueSubscriptions.length === 0) {
            console.log("No recurring jobs to generate today.");
            return;
        }

        for (const sub of dueSubscriptions) {
            const vehicles = await ctx.runQuery(query(async ({ db }) => {
                return db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', sub.customerId)).first();
            }));

            if (!vehicles) {
                console.warn(`Skipping job for subscription ${sub._id} as customer has no vehicles.`);
                continue;
            }

            const services = await Promise.all(sub.serviceIds.map(id => ctx.runQuery(query(async ({db}) => db.get(id)))));
            const jobItems = services.filter(Boolean).map(service => ({
                id: `item_${Date.now()}_${service!._id}`,
                serviceId: service!._id,
                quantity: 1,
                unitPrice: service!.basePrice,
                appliedPricingRuleIds: [],
                addedUpchargeIds: [],
                total: service!.basePrice,
            }));

            const jobId = await ctx.runMutation(mutation(async ({ db }, args) => {
                return await db.insert('jobs', args);
            }), {
                customerId: sub.customerId,
                vehicleId: vehicles._id,
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
            
            // Schedule for morning of due date
            const appointmentTime = new Date(sub.nextDueDate);
            appointmentTime.setHours(9, 0, 0, 0);

            await ctx.runMutation(mutation(async({db}, args) => {
                await db.insert('appointments', args);
            }), {
                jobId,
                startTime: appointmentTime.getTime(),
                endTime: appointmentTime.getTime() + 2 * 60 * 60 * 1000, // Placeholder 2hr duration
                status: 'scheduled' as const,
                description: "Recurring Service",
            });
            
            // Calculate next due date
            const nextDueDate = new Date(sub.nextDueDate);
            switch (sub.frequency) {
                case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'biweekly': nextDueDate.setDate(nextDueDate.getDate() + 14); break;
                case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                case 'quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
                case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
            }
            
            await ctx.runMutation(mutation(async({db}, args) => {
                await db.patch(args.id, { nextDueDate: args.nextDueDate });
            }), { id: sub._id, nextDueDate: nextDueDate.getTime() });

            console.log(`Generated job ${jobId} for subscription ${sub._id}`);
        }
    }
});