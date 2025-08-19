import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { customerCount } from './aggregates';

export const saveCustomerWithVehicles = mutation({
    args: {
        customerId: v.optional(v.id('customers')),
        customerData: v.object({
            name: v.string(),
            phone: v.string(),
            email: v.string(),
            address: v.optional(v.string()),
            internalNotes: v.optional(v.string())
        }),
        vehiclesData: v.array(v.object({
            vin: v.string(),
            make: v.string(),
            model: v.string(),
            year: v.number(),
            color: v.optional(v.string()),
        })),
    },
    handler: async (ctx, { customerId, customerData, vehiclesData }) => {
        let finalCustomerId: string;

        if (customerId) {
            // Update existing customer
            await ctx.db.patch(customerId, customerData);
            finalCustomerId = customerId;
        } else {
            // Create new customer
            finalCustomerId = await ctx.db.insert('customers', customerData);
            const newCustomerDoc = await ctx.db.get(finalCustomerId);
            if (newCustomerDoc) {
                await customerCount.insert(ctx, newCustomerDoc);
            }
        }

        // We can't do a clean "upsert" by VIN easily, so we'll delete existing and re-insert.
        // A more complex implementation could do a diff.
        const existingVehicles = await ctx.db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', finalCustomerId)).collect();
        for (const vehicle of existingVehicles) {
            await ctx.db.delete(vehicle._id);
        }
        
        for (const vehicle of vehiclesData) {
            await ctx.db.insert('vehicles', {
                ...vehicle,
                customerId: finalCustomerId,
            });
        }
        
        return finalCustomerId;
    }
});

export const remove = mutation({
    args: { id: v.id('customers') },
    handler: async (ctx, { id }) => {
        const customerDoc = await ctx.db.get(id);
        if (!customerDoc) return;

        // You might want to check for associated jobs before deleting
        const vehicles = await ctx.db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', id)).collect();
        for (const vehicle of vehicles) {
            await ctx.db.delete(vehicle._id);
        }
        await ctx.db.delete(id);
        await customerCount.delete(ctx, customerDoc);
    }
});