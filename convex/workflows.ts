import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GoogleGenAI } from "@google/genai";
import { WorkflowManager, vWorkflowId } from "@convex-dev/workflow";
import { jobStats } from "./aggregates";

// --- Workflow Managers for different priority levels ---
export const highPriorityWorkflowManager = new WorkflowManager(components.highPriorityWorkflow, {
    workpoolOptions: { maxParallelism: 10 }
});
export const defaultPriorityWorkflowManager = new WorkflowManager(components.defaultPriorityWorkflow, {
    workpoolOptions: { maxParallelism: 5 }
});
export const lowPriorityWorkflowManager = new WorkflowManager(components.lowPriorityWorkflow, {
    workpoolOptions: { maxParallelism: 3 }
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Result Validator ---
const vSuccessResult = v.object({ kind: v.literal("success"), returnValue: v.any() });
const vErrorResult = v.object({ kind: v.literal("error"), error: v.any() });
const vCanceledResult = v.object({ kind: v.literal("canceled") });
const vResult = v.union(vSuccessResult, vErrorResult, vCanceledResult);


// =================================================================
// 1. VISUAL QUOTE WORKFLOW (Default Priority)
// =================================================================

export const visualQuoteWorkflow = defaultPriorityWorkflowManager.define({
    args: { jobId: v.id('jobs') },
    handler: async (step, { jobId }): Promise<{
        suggestedServiceIds: Id<'services'>[];
        suggestedUpchargeIds: Id<'upcharges'>[];
    }> => {
        return await step.runAction(internal.workflows.prepareAndAnalyzePhotos, { jobId }, {
            retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 }
        });
    }
});

export const prepareAndAnalyzePhotos = internalAction({
    args: { jobId: v.id("jobs") },
    handler: async (ctx, { jobId }) => {
        const job = await ctx.runQuery(api.jobs.get, { id: jobId });
        if (!job || !job.visualQuoteStorageIds) {
            throw new Error("Job or photo storage IDs not found.");
        }
        
        const services = await ctx.runQuery(api.services.getAll);
        const upcharges = await ctx.runQuery(api.pricing.getAllUpcharges);
        if (!services || !upcharges) throw new Error("Could not fetch services or upcharges.");
        
        const imageUrls = await Promise.all(
            job.visualQuoteStorageIds.map((id) => ctx.runQuery(api.files.getUrl, { storageId: id }))
        );

        const imageParts = await Promise.all(
            imageUrls.map(async (url) => {
                if (!url) throw new Error("Image URL not found");
                const response = await fetch(url);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                
                const bytes = new Uint8Array(buffer);
                let binary = "";
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                return { inlineData: { mimeType: blob.type, data: base64Data } };
            })
        );

        const prompt = `Analyze these photos of a vehicle that needs detailing. Based on the visible condition (dirt, swirls, stains, etc.), suggest a quote. Respond in JSON format. The JSON object should have two keys: "suggestedServiceIds" and "suggestedUpchargeIds".
            - "suggestedServiceIds": An array of service IDs that are most appropriate.
            - "suggestedUpchargeIds": An array of upcharge IDs for things like "Excessive Pet Hair" or "Heavy Stains".
            Available Services: ${JSON.stringify(services.map(s => ({ id: s._id, name: s.name, description: s.description })))}
            Available Upcharges: ${JSON.stringify(upcharges.map(u => ({ id: u._id, name: u.name, description: u.description })))}`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...imageParts, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const suggestions = JSON.parse(response.text);
        return {
            suggestedServiceIds: suggestions.suggestedServiceIds || [],
            suggestedUpchargeIds: suggestions.suggestedUpchargeIds || [],
        };
    }
});

export const handleVisualQuoteCompletion = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResult,
        context: v.object({ jobId: v.id('jobs') }),
    },
    handler: async (ctx, { result, context }) => {
        const { jobId } = context;

        if (result.kind === 'error') {
            console.error(`Visual quote workflow failed for job ${jobId}:`, result.error);
            await ctx.db.patch(jobId, { visualQuoteStatus: 'failed' });
            return;
        }

        if (result.kind === 'canceled') {
            console.log(`Visual quote workflow canceled for job ${jobId}`);
            await ctx.db.patch(jobId, { visualQuoteStatus: 'failed' }); // Treat cancel as failure for simplicity
            return;
        }

        // Handle success
        const oldDoc = await ctx.db.get(jobId);
        if (!oldDoc) return;
        
        const { suggestedServiceIds, suggestedUpchargeIds } = result.returnValue;
        const services = await ctx.db.query('services').collect();
        const upcharges = await ctx.db.query('upcharges').collect();

        const newJobItems: any[] = suggestedServiceIds.map((serviceId: Id<'services'>) => {
            const service = services.find(s => s._id === serviceId);
            if (!service) return null;
            return {
                id: `item_${Date.now()}_${serviceId}`, serviceId, quantity: 1, unitPrice: service.basePrice,
                appliedPricingRuleIds: [], addedUpchargeIds: [], total: service.basePrice,
            };
        }).filter(Boolean);

        if (newJobItems.length > 0 && suggestedUpchargeIds.length > 0) {
            newJobItems[0].addedUpchargeIds.push(...suggestedUpchargeIds);
        }
        
        for (const item of newJobItems) {
            let itemTotal = item.unitPrice;
            for (const upchargeId of item.addedUpchargeIds) {
                const upcharge = upcharges.find(u => u._id === upchargeId);
                if (upcharge) itemTotal += upcharge.isPercentage ? itemTotal * (upcharge.defaultAmount / 100) : upcharge.defaultAmount;
            }
            item.total = itemTotal;
        }

        const totalAmount = newJobItems.reduce((sum, item) => sum + item.total, 0);

        await ctx.db.patch(jobId, { jobItems: newJobItems, visualQuoteStatus: 'complete', totalAmount });

        const newDoc = await ctx.db.get(jobId);
        if (newDoc) await jobStats.replace(ctx, oldDoc, newDoc);
    }
});


// =================================================================
// 2. CAMPAIGN GENERATION WORKFLOW (Low Priority)
// =================================================================

export const campaignGenerationWorkflow = lowPriorityWorkflowManager.define({
    args: { goal: v.string() },
    handler: async (step, { goal }): Promise<{ subject: string; body: string; }> => {
        return await step.runAction(internal.workflows.generateCampaignText, { goal }, {
            retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 }
        });
    }
});

export const generateCampaignText = internalAction({
    args: { goal: v.string() },
    handler: async (ctx, { goal }) => {
        const company = await ctx.runQuery(api.company.get);
        const prompt = `I am the owner of an auto detailing business called "${company?.name || 'Detailing Pro'}". I want to create an email marketing campaign with the goal: "${goal}". Please generate a compelling subject line and email body. The tone should be professional but friendly. Respond ONLY with a JSON object with two keys: "subject" and "body". The body should be a single string with newline characters (\\n) for paragraphs.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text);
    }
});

export const handleCampaignGenerationCompletion = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResult,
        context: v.object({ campaignId: v.id('campaigns') }),
    },
    handler: async (ctx, { result, context }) => {
        const { campaignId } = context;
        if (result.kind === 'error') {
            console.error(`Campaign generation workflow failed for campaign ${campaignId}:`, result.error);
            await ctx.db.patch(campaignId, {
                status: 'failed',
                subject: 'Content Generation Failed',
                body: 'There was an error generating the content for this campaign. Please try creating a new one.'
            });
            return;
        }

        if (result.kind === 'canceled') {
            console.log(`Campaign generation workflow canceled for campaign ${campaignId}`);
            await ctx.db.patch(campaignId, { status: 'failed', subject: 'Canceled' });
            return;
        }

        const { subject, body } = result.returnValue;
        await ctx.db.patch(campaignId, { subject, body, status: 'complete' });
    }
});

// =================================================================
// 3. ONLINE BOOKING WORKFLOW (High Priority)
// =================================================================

export const onlineBookingWorkflow = highPriorityWorkflowManager.define({
    args: {
        customerInfo: v.object({ name: v.string(), email: v.string(), phone: v.string() }),
        vehicleInfo: v.object({ make: v.string(), model: v.string(), year: v.number(), color: v.string() }),
        serviceIds: v.array(v.id('services')),
        startTime: v.number(),
        totalPrice: v.number(),
        totalDurationMinutes: v.number(),
    },
    handler: async (step, args) => {
        const customerId = await step.runMutation(internal.workflows.findOrCreateCustomer, { customerInfo: args.customerInfo });
        const vehicleId = await step.runMutation(internal.workflows.createVehicle, { customerId, vehicleInfo: args.vehicleInfo });
        await step.runMutation(internal.workflows.createJobAndAppointment, {
            customerId, vehicleId, ...args
        });
    }
});

export const findOrCreateCustomer = internalMutation({
    args: { customerInfo: v.object({ name: v.string(), email: v.string(), phone: v.string() }) },
    handler: async (ctx, { customerInfo }) => {
        const existingCustomer = await ctx.db.query('customers').withIndex('by_email', q => q.eq('email', customerInfo.email)).first();
        if (existingCustomer) {
            return existingCustomer._id;
        }
        return await ctx.db.insert('customers', customerInfo);
    }
});

export const createVehicle = internalMutation({
    args: {
        customerId: v.id('customers'),
        vehicleInfo: v.object({ make: v.string(), model: v.string(), year: v.number(), color: v.string() })
    },
    handler: async (ctx, { customerId, vehicleInfo }) => {
        return await ctx.db.insert('vehicles', { ...vehicleInfo, customerId, vin: 'N/A_OnlineBooking' });
    }
});

export const createJobAndAppointment = internalMutation({
    args: {
        customerId: v.id('customers'), vehicleId: v.id('vehicles'), serviceIds: v.array(v.id('services')),
        startTime: v.number(), totalPrice: v.number(), totalDurationMinutes: v.number(),
    },
    handler: async (ctx, args) => {
        const services = await Promise.all(args.serviceIds.map(id => ctx.db.get(id)));
        const jobItems = services.map(service => {
            if (!service) throw new Error("Service not found");
            return { id: `item_${Date.now()}_${service._id}`, serviceId: service._id, quantity: 1, unitPrice: service.basePrice, appliedPricingRuleIds: [], addedUpchargeIds: [], total: service.basePrice, };
        });
        const jobId = await ctx.db.insert('jobs', { customerId: args.customerId, vehicleId: args.vehicleId, status: 'workOrder', estimateDate: Date.now(), workOrderDate: Date.now(), totalAmount: args.totalPrice, paymentReceived: 0, paymentStatus: 'unpaid', jobItems, customerApprovalStatus: 'approved', notes: 'Booked online by customer.', inventoryDebited: false });
        await ctx.db.insert('appointments', { jobId, startTime: args.startTime, endTime: args.startTime + args.totalDurationMinutes * 60 * 1000, status: 'scheduled', description: 'Online Booking' });
    }
});


// =================================================================
// 4. SEND CAMPAIGN WORKFLOW (Low Priority)
// =================================================================

export const sendCampaignWorkflow = lowPriorityWorkflowManager.define({
    args: { campaignId: v.id('campaigns') },
    handler: async (step, { campaignId }) => {
        const campaign = await step.runQuery(internal.workflows.getCampaign, { campaignId });
        const customers = await step.runQuery(internal.workflows.getAllCustomers, {});
        
        if (!campaign || !campaign.subject || !campaign.body) {
            throw new Error("Campaign content is missing.");
        }

        await Promise.all(customers.map(customer => 
            step.runAction(internal.workflows.sendSingleEmail, {
                to: customer.email,
                subject: campaign.subject!,
                body: campaign.body!.replace('{customer.name}', customer.name),
            }, { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } })
        ));
    }
});

export const getCampaign = internalQuery({
    args: { campaignId: v.id('campaigns') },
    handler: (ctx, { campaignId }) => ctx.db.get(campaignId),
});

export const getAllCustomers = internalQuery({
    handler: (ctx) => ctx.db.query('customers').collect(),
});

export const sendSingleEmail = internalAction({
    args: { to: v.string(), subject: v.string(), body: v.string() },
    handler: async (_, { to, subject, body }) => {
        // In a real app, this would use an email service like Resend or SendGrid.
        console.log(`--- SIMULATING CAMPAIGN EMAIL ---
        To: ${to}
        Subject: ${subject}
        
        ${body}
        ---------------------------------`);
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 100));
    }
});

export const handleCampaignSentCompletion = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResult,
        context: v.object({ campaignId: v.id('campaigns') }),
    },
    handler: async (ctx, { result, context }) => {
        const { campaignId } = context;
        if (result.kind === 'error' || result.kind === 'canceled') {
            console.error(`Sending campaign ${campaignId} failed:`, result.kind === 'error' ? result.error : 'Canceled');
            await ctx.db.patch(campaignId, { status: 'failed' });
        } else {
            await ctx.db.patch(campaignId, { status: 'sent', sentAt: Date.now() });
        }
    }
});

// =================================================================
// 5. APPOINTMENT REMINDER WORKFLOW (High Priority)
// =================================================================

export const appointmentReminderWorkflow = highPriorityWorkflowManager.define({
    args: { appointmentId: v.id('appointments') },
    handler: async (step, { appointmentId }): Promise<void> => {
        await step.runAction(internal.workflows.sendAndLogReminderEmailAction, { appointmentId }, {
            retry: { maxAttempts: 3, initialBackoffMs: 60 * 1000, base: 2 } // Retry up to 3 times over a few minutes
        });
    }
});

export const sendAndLogReminderEmailAction = internalAction({
    args: { appointmentId: v.id('appointments') },
    handler: async (ctx, { appointmentId }) => {
        const appointment = await ctx.runQuery(api.appointments.get, { id: appointmentId });
        if (!appointment) return;

        const job = await ctx.runQuery(api.jobs.get, { id: appointment.jobId });
        if (!job) return;

        const customer = await ctx.runQuery(internal.workflows.getCustomer, { id: job.customerId });
        if (!customer) return;

        const reminderMessage = `Hi ${customer.name},\n\nThis is a friendly reminder of your upcoming auto detailing appointment scheduled for ${new Date(appointment.startTime).toLocaleString()}.\n\nWe look forward to seeing you!\n\n- Detailing Pro`;
        
        // In a real app, you would integrate an email service here.
        console.log(`--- SIMULATING REMINDER EMAIL ---
        To: ${customer.email}
        Subject: Appointment Reminder
        
        ${reminderMessage}
        ---------------------------------`);
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await ctx.runMutation(internal.communication.logMessage, {
            jobId: job._id,
            content: reminderMessage,
            type: 'automated_reminder',
        });
    }
});

export const handleReminderCompletion = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResult,
        context: v.object({ appointmentId: v.id('appointments') }),
    },
    handler: async (ctx, { result, context }) => {
        const { appointmentId } = context;
        if (result.kind === 'error' || result.kind === 'canceled') {
            console.error(`Sending reminder for appointment ${appointmentId} failed:`, result.kind === 'error' ? result.error : 'Canceled');
            // Optionally clear the workflowId to allow retry on the next cron run
            // await ctx.db.patch(appointmentId, { reminderWorkflowId: undefined });
        } else {
            await ctx.db.patch(appointmentId, { reminderSentAt: Date.now() });
        }
    }
});

export const getCustomer = internalQuery({
    args: { id: v.id("customers") },
    handler: (ctx, {id}) => ctx.db.get(id),
});