import { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const getUrl = query(async (ctx, { storageId }: { storageId: Id<"_storage"> }) => {
    return await ctx.storage.getUrl(storageId);
});