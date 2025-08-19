import { v } from 'convex/values';
import { action, internalAction, internalMutation, query, internalQuery } from './_generated/server';
import { api, internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { highPriorityWorkflowManager } from './workflows';

// --- QUERIES ---

export const getHistoryForJob = query({
    args: { jobId: v.id('jobs') },
    handler: async (ctx, { jobId }) => {
        return await ctx.db
            .query('communicationLogs')
            .withIndex('by_job', q => q.eq('jobId', jobId))
            .order('desc')
            .collect();
    }
});

// --- MANUAL MESSAGING ---

export const sendManualEmail = action({
    args: {
        jobId: v.id('jobs'),
        message: v.string(),
    },
    handler: async (ctx, { jobId, message }) => {
        const job = await ctx.runQuery(api.jobs.get, { id: jobId });
        if (!job) throw new Error("Job not found");

        const customer = await ctx.runQuery(internal.workflows.getCustomer, { id: job.customerId });
        if (!customer) throw new Error("Customer not found");

        // In a real app, you would integrate an email service like Resend or SendGrid here.
        console.log(`--- SIMULATING EMAIL ---
        To: ${customer.email}
        Subject: Regarding your service (Job #${job._id.slice(-6)})
        
        ${message}
        -----------------------`);
        
        await ctx.runMutation(internal.communication.logMessage, {
            jobId,
            content: message,
            type: 'manual_message',
        });
    }
});

// --- AUTOMATED REMINDERS (Workflow-based) ---

export const dispatchReminderWorkflows = internalAction({
    handler: async (ctx) => {
        const company = await ctx.runQuery(api.company.get);
        if (!company?.enableEmailReminders) {
            console.log("Email reminders are disabled. Skipping dispatch.");
            return;
        }

        const now = Date.now();
        const reminderWindowStart = now + 23.5 * 60 * 60 * 1000; // 23.5 hours from now
        const reminderWindowEnd = now + 24.5 * 60 * 60 * 1000; // 24.5 hours from now

        const appointmentsToRemind = await ctx.runQuery(internal.communication.getAppointmentsForReminder, {
            startTime: reminderWindowStart,
            endTime: reminderWindowEnd,
        });

        for (const appointment of appointmentsToRemind) {
            // Check if a workflow is already running or has been run
            if (!appointment.reminderWorkflowId) { 
                const workflowId = await highPriorityWorkflowManager.start(ctx, internal.workflows.appointmentReminderWorkflow, 
                    { appointmentId: appointment._id },
                    { 
                        onComplete: internal.workflows.handleReminderCompletion,
                        context: { appointmentId: appointment._id }
                    }
                );
                // Track the workflow to prevent duplicates
                await ctx.runMutation(internal.communication.setAppointmentWorkflowId, { appointmentId: appointment._id, workflowId: workflowId as string });
            }
        }
    }
});

export const setAppointmentWorkflowId = internalMutation({
    args: { appointmentId: v.id('appointments'), workflowId: v.string() },
    handler: async (ctx, { appointmentId, workflowId }) => {
        await ctx.db.patch(appointmentId, { reminderWorkflowId: workflowId });
    }
});

export const getAppointmentsForReminder = internalQuery({
    args: { startTime: v.number(), endTime: v.number() },
    handler: async (ctx, { startTime, endTime }) => {
        return await ctx.db
            .query('appointments')
            .filter(q => q.and(
                q.gte(q.field('startTime'), startTime),
                q.lte(q.field('startTime'), endTime),
                q.eq(q.field('reminderSentAt'), undefined),
                q.eq(q.field('status'), 'scheduled')
            ))
            .collect();
    }
});

export const logMessage = internalMutation({
    args: {
        jobId: v.id('jobs'),
        content: v.string(),
        type: v.union(v.literal('automated_reminder'), v.literal('manual_message')),
        appointmentIdToUpdate: v.optional(v.id('appointments')),
    },
    handler: async (ctx, { jobId, content, type, appointmentIdToUpdate }) => {
        await ctx.db.insert('communicationLogs', {
            jobId,
            content,
            type,
            method: 'email',
            timestamp: Date.now(),
        });

        if (type === 'automated_reminder' && appointmentIdToUpdate) {
            await ctx.db.patch(appointmentIdToUpdate, { reminderSentAt: Date.now() });
        }
    }
});