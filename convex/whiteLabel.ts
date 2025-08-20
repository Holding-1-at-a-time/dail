import { query } from "./_generated/server";

export const getBranding = query({
    handler: async (ctx) => {
        const company = await ctx.db.query("company").first();
        if (!company) {
            return { name: "Detailing Pro", logoUrl: null, brandColor: "#00AE98" };
        }

        const logoUrl = company.logoStorageId 
            ? await ctx.storage.getUrl(company.logoStorageId)
            : null;

        return {
            name: company.name,
            logoUrl,
            brandColor: company.brandColor,
        };
    }
});
