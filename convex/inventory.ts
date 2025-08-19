import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';
import { productStockStatusAggregate } from './aggregates';
import { api, internal } from './_generated/api';

export const getData = query({
    handler: async (ctx) => {
        const products = await ctx.db.query('products').collect();
        const suppliers = await ctx.db.query('suppliers').collect();
        return { products, suppliers };
    }
});

export const getProductByBarcode = query({
    args: { barcode: v.string() },
    handler: async (ctx, { barcode }) => {
        if (!barcode) return null;
        return await ctx.db.query('products').withIndex('by_barcode', q => q.eq('barcode', barcode)).unique();
    }
});

export const getLogsForProduct = query({
    args: { productId: v.id('products') },
    handler: async (ctx, { productId }) => {
        return await ctx.db.query('inventoryLog').withIndex('by_product', q => q.eq('productId', productId)).order('desc').collect();
    }
});

export const createProduct = mutation({
    args: {
        name: v.string(),
        category: v.string(),
        supplierId: v.id('suppliers'),
        stockLevel: v.number(),
        reorderPoint: v.number(),
        unit: v.optional(v.string()),
        barcode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.barcode) {
            const existing = await ctx.db.query('products').withIndex('by_barcode', q => q.eq('barcode', args.barcode!)).first();
            if (existing) throw new Error("A product with this barcode already exists.");
        }
        const productId = await ctx.db.insert('products', args);
        const newDoc = await ctx.db.get(productId);
        if (newDoc) {
            await productStockStatusAggregate.insert(ctx, newDoc);
        }
        return productId;
    }
});

export const updateProduct = mutation({
    args: {
        id: v.id('products'),
        name: v.string(),
        category: v.string(),
        supplierId: v.id('suppliers'),
        stockLevel: v.number(),
        reorderPoint: v.number(),
        unit: v.optional(v.string()),
        barcode: v.optional(v.string()),
    },
    handler: async (ctx, { id, ...rest }) => {
        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) throw new Error("Product not found");

        if (rest.barcode) {
            const existing = await ctx.db.query('products').withIndex('by_barcode', q => q.eq('barcode', rest.barcode!)).first();
            if (existing && existing._id !== id) throw new Error("A product with this barcode already exists.");
        }

        await ctx.db.patch(id, rest);

        const newDoc = await ctx.db.get(id);
        if (newDoc) {
            await productStockStatusAggregate.replace(ctx, oldDoc, newDoc);
        }
    }
});

export const deleteProduct = mutation({
    args: { id: v.id('products') },
    handler: async (ctx, { id }) => {
        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) return;
        
        await ctx.db.delete(id);
        await productStockStatusAggregate.delete(ctx, oldDoc);

        await ctx.runMutation(internal.auditLog.record, {
            action: "delete_product",
            details: {
                targetId: id,
                targetName: oldDoc.name,
            }
        });
    }
});

export const receiveMultipleStockItems = mutation({
    args: {
        items: v.array(v.object({
            productId: v.id('products'),
            quantity: v.number(),
            costPerUnit: v.optional(v.number()),
            notes: v.optional(v.string()),
        }))
    },
    handler: async (ctx, { items }) => {
        for (const item of items) {
             const oldDoc = await ctx.db.get(item.productId);
            if (!oldDoc) continue; // Skip if product not found

            const newStockLevel = oldDoc.stockLevel + item.quantity;
            await ctx.db.patch(item.productId, { stockLevel: newStockLevel, lastCostPerUnit: item.costPerUnit });
            
            await ctx.db.insert('inventoryLog', {
                productId: item.productId,
                change: item.quantity,
                newStockLevel,
                type: 'received',
                costPerUnit: item.costPerUnit,
                notes: item.notes,
                timestamp: Date.now(),
            });
            
            const newDoc = await ctx.db.get(item.productId);
            if (newDoc) {
                await productStockStatusAggregate.replace(ctx, oldDoc, newDoc);
            }
        }
    }
});

export const debitInventoryForJob = internalMutation({
    args: { jobId: v.id('jobs') },
    handler: async (ctx, { jobId }) => {
        const job = await ctx.db.get(jobId);
        if (!job || job.inventoryDebited) return;

        const services = await ctx.db.query('services').collect();
        
        const productsToDebit = new Map<Id<'products'>, number>();
        job.jobItems.forEach(item => {
            const service = services.find(s => s._id === item.serviceId);
            service?.productsUsed?.forEach(pu => {
                productsToDebit.set(pu.productId, (productsToDebit.get(pu.productId) || 0) + pu.quantity);
            });
        });

        for (const [productId, quantity] of productsToDebit.entries()) {
            const oldProductDoc = await ctx.db.get(productId);
            if (oldProductDoc) {
                const newStockLevel = oldProductDoc.stockLevel - quantity;
                await ctx.db.patch(productId, { stockLevel: newStockLevel });
                await ctx.db.insert('inventoryLog', {
                    productId,
                    change: -quantity,
                    newStockLevel,
                    type: 'job_deduction',
                    jobId,
                    timestamp: Date.now(),
                });
                
                const newProductDoc = await ctx.db.get(productId);
                if (newProductDoc) {
                    await productStockStatusAggregate.replace(ctx, oldProductDoc, newProductDoc);
                }
            }
        }
        await ctx.db.patch(jobId, { inventoryDebited: true });
        await ctx.runMutation(internal.learning.updateLearnedMappings, { jobId });
    }
});

// --- Forecasting & Alerts ---

const FORECASTING_PERIOD_DAYS = 90;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

export const runForecastingForAllProducts = internalAction({
    handler: async (ctx) => {
        const products = await ctx.runQuery(api.inventory.getData);
        for (const product of products.products) {
            await ctx.runAction(internal.inventory.calculateForecastForProduct, { productId: product._id });
        }
    }
});

export const calculateForecastForProduct = internalAction({
    args: { productId: v.id('products') },
    handler: async (ctx, { productId }) => {
        const product = await ctx.runQuery(internal.inventory.getProduct, { id: productId });
        if (!product) return;

        const lookbackDate = Date.now() - FORECASTING_PERIOD_DAYS * MS_IN_DAY;
        const logs = await ctx.runQuery(internal.inventory.getConsumptionLogsSince, { productId, timestamp: lookbackDate });

        const totalConsumption = logs.reduce((sum, log) => sum + Math.abs(log.change), 0);
        const dailyConsumptionRate = totalConsumption / FORECASTING_PERIOD_DAYS;
        
        const predictedDepletionDate = dailyConsumptionRate > 0 
            ? Date.now() + (product.stockLevel / dailyConsumptionRate) * MS_IN_DAY
            : undefined;

        await ctx.runMutation(internal.inventory.saveForecast, {
            productId,
            dailyConsumptionRate,
            predictedDepletionDate,
        });
    }
});

export const getProduct = internalQuery({
    args: { id: v.id('products') },
    handler: (ctx, { id }) => ctx.db.get(id),
});

export const getConsumptionLogsSince = internalQuery({
    args: { productId: v.id('products'), timestamp: v.number() },
    handler: async (ctx, { productId, timestamp }) => {
        return await ctx.db.query('inventoryLog')
            .withIndex('by_product', q => q.eq('productId', productId))
            .filter(q => q.and(
                q.eq(q.field('type'), 'job_deduction'),
                q.gt(q.field('timestamp'), timestamp)
            ))
            .collect();
    }
});

export const saveForecast = internalMutation({
    args: {
        productId: v.id('products'),
        dailyConsumptionRate: v.number(),
        predictedDepletionDate: v.optional(v.number()),
    },
    handler: (ctx, args) => ctx.db.patch(args.productId, { ...args }),
});

export const generateLowStockAlerts = internalAction({
    handler: async (ctx) => {
        const lowStockProducts = await ctx.runQuery(internal.inventory.getLowStockProducts);
        const suppliers = await ctx.runQuery(api.inventory.getData).then(d => d.suppliers);
        
        for (const product of lowStockProducts) {
            const hasUnreadAlert = await ctx.runQuery(internal.inventory.hasUnreadAlertForProduct, { productId: product._id });
            if (!hasUnreadAlert) {
                const supplier = suppliers.find(s => s._id === product.supplierId);
                const message = await ctx.runAction(internal.ai.generateReorderSuggestion, {
                    productName: product.name,
                    stockLevel: product.stockLevel,
                    supplierName: supplier?.name || 'Unknown Supplier',
                    leadTimeDays: supplier?.estimatedLeadTimeDays,
                });

                await ctx.runMutation(internal.inventory.createNotification, {
                    productId: product._id,
                    title: `Low Stock: ${product.name}`,
                    message,
                });
            }
        }
    }
});

export const getLowStockProducts = internalQuery({
    handler: async (ctx) => {
        const products = await ctx.db.query('products').collect();
        return products.filter(p => p.stockLevel <= p.reorderPoint);
    }
});

export const hasUnreadAlertForProduct = internalQuery({
    args: { productId: v.id('products') },
    handler: async (ctx, { productId }) => {
        const alert = await ctx.db.query('notifications')
            .withIndex('by_read_status', q => q.eq('isRead', false))
            .filter(q => q.eq(q.field('productId'), productId))
            .first();
        return !!alert;
    }
});

export const createNotification = internalMutation({
    args: {
        productId: v.id('products'),
        title: v.string(),
        message: v.string(),
    },
    handler: (ctx, args) => {
        return ctx.db.insert('notifications', {
            ...args,
            isRead: false,
            timestamp: Date.now(),
        });
    }
});