import { v } from 'convex/values';
import { query, action, mutation } from './_generated/server';
import { api, internal } from './_generated/api';
import { rateLimiter } from './rateLimiter';
import { highPriorityWorkflowManager } from './workflows';

export const getPublicServices = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("services")
            .filter(q => q.eq(q.field("isDealerPackage"), false))
            .collect();
    }
});

export const getAvailableSlots = action({
    args: {
        date: v.string(), // YYYY-MM-DD
        totalDurationMinutes: v.number(),
    },
    handler: async (ctx, { date, totalDurationMinutes }) => {
        const company = await ctx.runQuery(api.company.get);
        if (!company?.businessHours) {
            throw new Error("Business hours are not configured.");
        }

        const slotDuration = company.slotDurationMinutes || 30;
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        
        const hours = company.businessHours[dayOfWeek];
        if (!hours || !hours.enabled) {
            return []; // Closed on this day
        }

        const [startHour, startMinute] = hours.start.split(':').map(Number);
        const [endHour, endMinute] = hours.end.split(':').map(Number);

        const dayStart = new Date(date);
        dayStart.setUTCHours(startHour, startMinute, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setUTCHours(endHour, endMinute, 0, 0);

        const appointments = await ctx.runQuery(api.appointments.getAll);
        const appointmentsOnDate = appointments.filter(a => {
            const apptDate = new Date(a.startTime).toISOString().split('T')[0];
            return apptDate === date;
        });

        const availableSlots: string[] = [];
        let currentSlotTime = dayStart.getTime();

        while (currentSlotTime < dayEnd.getTime()) {
            const slotStart = currentSlotTime;
            const slotEnd = slotStart + totalDurationMinutes * 60 * 1000;

            if (slotEnd > dayEnd.getTime()) {
                break; // Not enough time left in the day
            }
            
            let isAvailable = true;
            for (const appt of appointmentsOnDate) {
                if (slotStart < appt.endTime && slotEnd > appt.startTime) {
                    isAvailable = false;
                    break;
                }
            }

            if (isAvailable) {
                availableSlots.push(new Date(slotStart).toISOString());
            }

            currentSlotTime += slotDuration * 60 * 1000;
        }

        return availableSlots;
    }
});


export const createBooking = mutation({
    args: {
        customerInfo: v.object({ name: v.string(), email: v.string(), phone: v.string() }),
        vehicleInfo: v.object({ make: v.string(), model: v.string(), year: v.number(), color: v.string() }),
        serviceIds: v.array(v.id('services')),
        startTime: v.number(),
        totalPrice: v.number(),
        totalDurationMinutes: v.number(),
    },
    handler: async (ctx, args) => {
        // Apply rate limiting to the public endpoint.
        await rateLimiter.limit(ctx, "publicBooking", { throws: true });

        // Start the resilient booking workflow in the high-priority queue.
        await highPriorityWorkflowManager.start(ctx, internal.workflows.onlineBookingWorkflow, args);
        
        return { success: true };
    }
});