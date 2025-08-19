import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getUnread = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_read_status', q => q.eq('isRead', false))
            .order('desc')
            .collect();
        
        const notificationsWithProduct = await Promise.all(
            notifications.map(async (n) => {
                const product = await ctx.db.get(n.productId);
                return { ...n, productName: product?.name || 'Unknown Product' };
            })
        );
        return notificationsWithProduct;
    }
});

export const markAsRead = mutation({
    args: { ids: v.array(v.id('notifications')) },
    handler: async (ctx, { ids }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        await Promise.all(ids.map(id => ctx.db.patch(id, { isRead: true })));
    }
});