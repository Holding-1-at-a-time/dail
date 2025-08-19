import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Called after inventory is debited for a completed job.
export const updateLearnedMappings = internalMutation({
    args: { jobId: v.id('jobs') },
    handler: async (ctx, { jobId }) => {
        const job = await ctx.db.get(jobId);
        if (!job) return;

        const deductedProducts = await ctx.db
            .query('inventoryLog')
            .filter(q => q.eq(q.field('jobId'), jobId))
            .collect();
        
        const productIds = deductedProducts.map(log => log.productId);
        const serviceIds = job.jobItems.map(item => item.serviceId);

        if (productIds.length === 0 || serviceIds.length === 0) return;

        for (const serviceId of serviceIds) {
            for (const productId of productIds) {
                const existingMapping = await ctx.db
                    .query('learnedProductServiceMapping')
                    .withIndex('by_service_product', q => q.eq('serviceId', serviceId).eq('productId', productId))
                    .unique();

                if (existingMapping) {
                    await ctx.db.patch(existingMapping._id, {
                        associationScore: existingMapping.associationScore + 1,
                        lastUpdatedAt: Date.now(),
                    });
                } else {
                    await ctx.db.insert('learnedProductServiceMapping', {
                        serviceId,
                        productId,
                        associationScore: 1,
                        lastUpdatedAt: Date.now(),
                    });
                }
            }
        }
    }
});

export const getLearnedSuggestionsForService = query({
    args: { serviceId: v.id('services') },
    handler: async (ctx, { serviceId }) => {
        const mappings = await ctx.db
            .query('learnedProductServiceMapping')
            .withIndex('by_service', q => q.eq('serviceId', serviceId))
            .order('desc')
            .take(5);

        // Sort by score descending since Convex doesn't support sorting by a non-index field.
        mappings.sort((a, b) => b.associationScore - a.associationScore);

        const products = await Promise.all(
            mappings.map(m => ctx.db.get(m.productId))
        );

        return products
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => ({
                ...p,
                associationScore: mappings.find(m => m.productId === p._id)?.associationScore || 0,
            }));
    }
});