import { v } from 'convex/values';
import { internalMutation, mutation, query, ActionCtx, action } from './_generated/server';
import { Id } from './_generated/dataModel';
import { customAlphabet } from 'nanoid';
import { api, internal } from './_generated/api';
import { jobStats, servicePerformanceAggregate, technicianPerformanceAggregate } from './aggregates';
import { rateLimiter } from './rateLimiter';
import { defaultPriorityWorkflowManager } from './workflows';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

const getUserId = async (ctx: ActionCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }
    const user = await ctx.runQuery(api.users.getByIdentity);
    if (!user) throw new Error("User not found");
    return user.clerkId;
};

// --- Queries ---

export const get = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    }
});

export const getDataForForm = query({
    handler: async (ctx) => {
        const customers = await ctx.db.query("customers").collect();
        const vehicles = await ctx.db.query("vehicles").collect();
        const services = await ctx.db.query("services").collect();
        const pricingMatrices = await ctx.db.query("pricingMatrices").collect();
        const upcharges = await ctx.db.query("upcharges").collect();
        const promotions = await ctx.db.query("promotions").collect();
        const products = await ctx.db.query("products").collect();
        return { customers, vehicles, services, pricingMatrices, upcharges, promotions, products };
    }
});

export const getDataForDetailPage = query({
    args: { jobId: v.id('jobs') },
    handler: async (ctx, { jobId }) => {
        const job = await ctx.db.get(jobId);
        if (!job) return null;
        
        const customer = await ctx.db.get(job.customerId);
        if (!customer) return null;

        const vehicle = await ctx.db.get(job.vehicleId);
        if (!vehicle) return null;
        
        const services = await ctx.db.query('services').collect();
        const checklists = await ctx.db.query('checklists').collect();
        const company = await ctx.db.query('company').first();
        
        const photoUrls = await Promise.all(
            (job.photos || []).map(async (p) => ({
                id: p.id,
                url: await ctx.storage.getUrl(p.storageId),
                type: p.type,
            }))
        );

        const signatureUrl = job.customerSignatureStorageId ? await ctx.storage.getUrl(job.customerSignatureStorageId) : null;
        
        const companyWithLogoUrl = company 
            ? { ...company, logoUrl: company.logoStorageId ? await ctx.storage.getUrl(company.logoStorageId) : null }
            : null;

        return { job, customer, vehicle, services, checklists, photoUrls, signatureUrl, company: companyWithLogoUrl };
    }
});

export const getJobItem = query({
    args: { jobItemId: v.string() },
    handler: async (ctx, { jobItemId }) => {
        const jobs = await ctx.db.query('jobs').collect();
        for (const job of jobs) {
            const item = job.jobItems.find(i => i.id === jobItemId);
            if (item) return item;
        }
        return null;
    }
});

export const getDataForCustomerPortal = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        const job = await ctx.db.query('jobs').withIndex('by_public_link_key', q => q.eq('publicLinkKey', key)).first();
        if (!job) return { job: null };

        const customer = await ctx.db.get(job.customerId);
        if (!customer) throw new Error("Customer not found for job");

        const vehicle = await ctx.db.get(job.vehicleId);
        if (!vehicle) throw new Error("Vehicle not found for job");
        
        const services = await ctx.db.query('services').collect();
        const photoUrls = await Promise.all(
            (job.photos || []).map(async (p) => ({ id: p.id, url: await ctx.storage.getUrl(p.storageId), type: p.type }))
        );
        const signatureUrl = job.customerSignatureStorageId ? await ctx.storage.getUrl(job.customerSignatureStorageId) : null;

        return { job, customer, vehicle, services, photoUrls, signatureUrl };
    }
});

// --- Mutations & Actions ---

export const createPaymentIntent = action({
    args: {
        jobId: v.id('jobs'),
        amount: v.number(), // in cents
    },
    handler: async (ctx, { jobId, amount }) => {
        const company = await ctx.runQuery(api.company.get);
        if (!company?.stripeAccountId) {
            throw new Error("The business has not set up their payments account.");
        }
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            application_fee_amount: Math.round(amount * 0.05), // 5% application fee
            transfer_data: {
                destination: company.stripeAccountId,
            },
            metadata: {
                jobId: jobId,
            },
        });

        return paymentIntent.client_secret;
    },
});

export const internalSavePayment = internalMutation({
    args: {
        jobId: v.id('jobs'),
        payment: v.object({ 
            amount: v.number(), // in cents
            paymentDate: v.number(), 
            method: v.union(v.literal('Cash'), v.literal('Credit Card'), v.literal('Check'), v.literal('Bank Transfer'), v.literal('Other')), 
            notes: v.optional(v.string()) 
        })
    },
    handler: async (ctx, { jobId, payment }) => {
        const oldJob = await ctx.db.get(jobId);
        if (!oldJob) throw new Error("Job not found");
        
        const amountInDollars = payment.amount / 100;
        const newPayment = { ...payment, amount: amountInDollars, id: `pay_${Date.now()}`};
        const payments = [...(oldJob.payments || []), newPayment];
        const paymentReceived = payments.reduce((sum, p) => sum + p.amount, 0);
        
        let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
        if (paymentReceived >= oldJob.totalAmount) paymentStatus = 'paid';
        if (paymentReceived <= 0) paymentStatus = 'unpaid';

        let status = oldJob.status;
        let completionDate = oldJob.completionDate;
        if (paymentStatus === 'paid' && status !== 'completed') {
            status = 'completed';
            completionDate = Date.now();
        }

        await ctx.db.patch(jobId, { payments, paymentReceived, paymentStatus, status, completionDate });
        
        await ctx.runMutation(internal.auditLog.record, {
            action: "record_payment",
            details: {
                targetId: jobId,
                targetName: `Job #${jobId.slice(-6)}`,
                extra: { amount: payment.amount, method: payment.method }
            }
        });

        const newDoc = await ctx.db.get(jobId);
        if (newDoc) {
            await jobStats.replace(ctx, oldJob, newDoc);
            await ctx.runMutation(internal.jobs.updateReportingAggregates, { oldJob, newJob: newDoc });
        }
        
        if (newDoc?.status === 'completed' && !newDoc.inventoryDebited) {
            const company = await ctx.db.query('company').first();
            if (company?.enableSmartInventory) {
                await ctx.scheduler.runAfter(0, internal.inventory.debitInventoryForJob, { jobId });
            }
        }
    }
});

// The rest of the file remains the same...
export const save = mutation({
    args: {
        id: v.optional(v.id('jobs')),
        customerId: v.id('customers'),
        vehicleId: v.id('vehicles'),
        status: v.union(v.literal('estimate'), v.literal('workOrder'), v.literal('invoice'), v.literal('completed'), v.literal('cancelled')),
        estimateDate: v.number(),
        notes: v.optional(v.string()),
        appliedPromotionId: v.optional(v.id('promotions')),
        discountAmount: v.number(),
        totalAmount: v.number(),
        jobItems: v.array(v.object({
            id: v.string(), serviceId: v.id('services'), quantity: v.number(), unitPrice: v.number(),
            appliedPricingRuleIds: v.array(v.string()), addedUpchargeIds: v.array(v.id('upcharges')),
            total: v.number()
        })),
    },
    handler: async (ctx, { id, ...data }) => {
        let jobId: Id<"jobs">;
        const oldDoc = id ? await ctx.db.get(id) : null;

        const statusChangedToCompleted = oldDoc?.status !== 'completed' && data.status === 'completed';

        if (id) {
            const existingJob = await ctx.db.get(id);
            const updatedJobItems = data.jobItems.map(newItem => {
                const existingItem = existingJob?.jobItems.find(i => i.id === newItem.id);
                return {
                    ...newItem,
                    checklistCompletedItems: existingItem?.checklistCompletedItems,
                };
            });
            await ctx.db.patch(id, {
                ...data, 
                jobItems: updatedJobItems,
                completionDate: statusChangedToCompleted ? Date.now() : oldDoc?.completionDate
            });
            jobId = id;
        } else {
            jobId = await ctx.db.insert('jobs', {
                ...data,
                workOrderDate: data.status === 'workOrder' ? Date.now() : undefined,
                invoiceDate: data.status === 'invoice' ? Date.now() : undefined,
                completionDate: data.status === 'completed' ? Date.now() : undefined,
                paymentReceived: 0,
                paymentStatus: 'unpaid',
                customerApprovalStatus: 'pending',
                publicLinkKey: nanoid(),
                inventoryDebited: false,
            });
        }
        
        const newDoc = await ctx.db.get(jobId);

        if (oldDoc && newDoc) {
            await jobStats.replace(ctx, oldDoc, newDoc);
        } else if (newDoc) {
            await jobStats.insert(ctx, newDoc);
        }

        await ctx.runMutation(internal.jobs.updateReportingAggregates, { oldJob: oldDoc, newJob: newDoc });
        
        if (newDoc?.status === 'completed' && !newDoc.inventoryDebited) {
            const company = await ctx.db.query('company').first();
            if (company?.enableSmartInventory) {
                await ctx.scheduler.runAfter(0, internal.inventory.debitInventoryForJob, { jobId });
            }
        }
        return jobId;
    }
});

export const createDraft = mutation({
    args: {
        customerId: v.id('customers'),
        vehicleId: v.id('vehicles'),
    },
    handler: async (ctx, args) => {
        const jobId = await ctx.db.insert('jobs', {
            ...args,
            status: 'estimate',
            estimateDate: Date.now(),
            totalAmount: 0,
            paymentReceived: 0,
            paymentStatus: 'unpaid',
            jobItems: [],
            customerApprovalStatus: 'pending',
            publicLinkKey: nanoid(),
        });
        const newDoc = await ctx.db.get(jobId);
        if (newDoc) {
            await jobStats.insert(ctx, newDoc);
        }
        return jobId;
    }
});

export const initiateVisualQuote = mutation({
    args: {
        jobId: v.id('jobs'),
        storageIds: v.array(v.id('_storage')),
    },
    handler: async (ctx, { jobId, storageIds }) => {
        const userId = await getUserId(ctx);
        await rateLimiter.limit(ctx, "heavyAI", { key: userId, throws: true });

        await ctx.db.patch(jobId, {
            visualQuoteStatus: 'pending',
            visualQuoteStorageIds: storageIds,
            jobItems: [],
            totalAmount: 0,
            discountAmount: 0,
        });
        
        await defaultPriorityWorkflowManager.start(ctx, internal.workflows.visualQuoteWorkflow, 
            { jobId },
            { 
                onComplete: internal.workflows.handleVisualQuoteCompletion,
                context: { jobId }
            }
        );
    }
});

export const remove = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, { id }) => {
        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) return;

        await ctx.db.delete(id);
        await jobStats.delete(ctx, oldDoc);
        await ctx.runMutation(internal.jobs.updateReportingAggregates, { oldJob: oldDoc, newJob: null });
    },
});

export const convertToWorkOrder = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, { id }) => {
        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) return;
        await ctx.db.patch(id, { status: 'workOrder', workOrderDate: Date.now() });
        const newDoc = await ctx.db.get(id);
        if (newDoc) {
            await jobStats.replace(ctx, oldDoc, newDoc);
            await ctx.runMutation(internal.jobs.updateReportingAggregates, { oldJob: oldDoc, newJob: newDoc });
        }
    },
});

export const generateInvoice = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, { id }) => {
        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) return;
        await ctx.db.patch(id, { status: 'invoice', invoiceDate: Date.now() });
        const newDoc = await ctx.db.get(id);
        if (newDoc) {
            await jobStats.replace(ctx, oldDoc, newDoc);
            await ctx.runMutation(internal.jobs.updateReportingAggregates, { oldJob: oldDoc, newJob: newDoc });
        }
    },
});

export const updateReportingAggregates = internalMutation({
    args: { oldJob: v.union(v.null(), v.any()), newJob: v.union(v.null(), v.any()) },
    handler: async (ctx, { oldJob, newJob }) => {
        const wasCompleted = oldJob?.status === 'completed' && oldJob.completionDate;
        const isCompleted = newJob?.status === 'completed' && newJob.completionDate;

        // Job was completed, and is no longer (or is being deleted)
        if (wasCompleted && !isCompleted) {
            for (const item of oldJob.jobItems) {
                await servicePerformanceAggregate.delete(ctx, { key: [item.serviceId, oldJob.completionDate], id: `${oldJob._id}-${item.id}` });
            }
            for (const techId of oldJob.assignedTechnicianIds ?? []) {
                await technicianPerformanceAggregate.delete(ctx, { key: [techId, oldJob.completionDate], id: `${oldJob._id}-${techId}` });
            }
        }

        // Job is now completed (or was and its data changed)
        if (isCompleted) {
            // If it was already completed (i.e. an update), remove old entries first
            if (wasCompleted) {
                 for (const item of oldJob.jobItems) {
                    await servicePerformanceAggregate.delete(ctx, { key: [item.serviceId, oldJob.completionDate], id: `${oldJob._id}-${item.id}` });
                }
                for (const techId of oldJob.assignedTechnicianIds ?? []) {
                    await technicianPerformanceAggregate.delete(ctx, { key: [techId, oldJob.completionDate], id: `${oldJob._id}-${techId}` });
                }
            }

            // Add new entries for the completed job
            for (const item of newJob.jobItems) {
                await servicePerformanceAggregate.insert(ctx, {
                    key: [item.serviceId, newJob.completionDate],
                    id: `${newJob._id}-${item.id}`,
                    sumValue: item.total,
                });
            }
            const techCount = newJob.assignedTechnicianIds?.length || 1;
            for (const techId of newJob.assignedTechnicianIds ?? []) {
                await technicianPerformanceAggregate.insert(ctx, {
                    key: [techId, newJob.completionDate],
                    id: `${newJob._id}-${techId}`,
                    sumValue: newJob.totalAmount / techCount,
                });
            }
        }
    }
});

export const updateChecklistProgress = mutation({
    args: { jobItemId: v.string(), completedTasks: v.array(v.string()) },
    handler: async (ctx, { jobItemId, completedTasks }) => {
        const jobs = await ctx.db.query('jobs').collect();
        for (const job of jobs) {
            const itemIndex = job.jobItems.findIndex(i => i.id === jobItemId);
            if (itemIndex > -1) {
                const newItems = [...job.jobItems];
                newItems[itemIndex].checklistCompletedItems = completedTasks;
                await ctx.db.patch(job._id, { jobItems: newItems });
                return;
            }
        }
    }
});

export const addPhoto = mutation({
    args: { jobId: v.id('jobs'), storageId: v.id('_storage'), type: v.union(v.literal('before'), v.literal('after')) },
    handler: async (ctx, { jobId, storageId, type }) => {
        const job = await ctx.db.get(jobId);
        if (!job) throw new Error("Job not found");
        const newPhoto = { id: `photo_${Date.now()}`, storageId, type, timestamp: Date.now() };
        await ctx.db.patch(jobId, { photos: [...(job.photos || []), newPhoto] });
    }
});

export const approveJob = mutation({
    args: { jobId: v.id('jobs'), signatureStorageId: v.id('_storage') },
    handler: async (ctx, { jobId, signatureStorageId }) => {
        await ctx.db.patch(jobId, {
            customerApprovalStatus: 'approved',
            customerSignatureStorageId: signatureStorageId,
            approvalTimestamp: Date.now()
        });
    }
});