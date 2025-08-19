import { mutation } from './_generated/server';

export const seedDatabase = mutation({
    handler: async (ctx) => {
        // Clear existing data
        const tables: (keyof typeof ctx.db._tables)[] = [
            "users", "company", "services", "pricingMatrices", "upcharges", 
            "checklists", "customers", "vehicles", "jobs", "appointments", 
            "suppliers", "products", "promotions", "campaigns"
        ];
        for (const table of tables) {
            const docs = await ctx.db.query(table).collect();
            await Promise.all(docs.map(doc => ctx.db.delete(doc._id)));
        }

        // Create a default user and company if not created by webhook yet
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Cannot seed without authenticated user.");
        
        let adminUser = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject!)).unique();
        if (!adminUser) {
            adminUser = {
                _id: await ctx.db.insert("users", {
                    clerkId: identity.subject!,
                    name: identity.name!,
                    email: identity.email!,
                    role: "admin",
                }),
                clerkId: identity.subject!,
                name: identity.name!,
                email: identity.email!,
                role: "admin",
            };
        }

        const companyId = await ctx.db.insert("company", {
            name: "Detailing Pro HQ",
            defaultLaborRate: 80,
        });

        // --- SEED DATA ---
        
        // Services
        const s1 = await ctx.db.insert("services", { name: "Basic Wash", description: "A thorough exterior wash.", basePrice: 50, isPackage: false, isDealerPackage: false, serviceIds: [], estimatedDurationHours: 1 });
        const s2 = await ctx.db.insert("services", { name: "Interior Detail", description: "Complete interior vacuum, wipe-down, and protectant.", basePrice: 150, isPackage: false, isDealerPackage: false, serviceIds: [], estimatedDurationHours: 2.5 });
        const s3 = await ctx.db.insert("services", { name: "Paint Correction", description: "Removes swirls and minor scratches.", basePrice: 400, isPackage: false, isDealerPackage: false, serviceIds: [], estimatedDurationHours: 5 });
        const s4 = await ctx.db.insert("services", { name: "Ceramic Coating", description: "Long-term paint protection.", basePrice: 800, isPackage: false, isDealerPackage: false, serviceIds: [], estimatedDurationHours: 8 });
        
        // Package Service
        await ctx.db.insert("services", { name: "The 'Pro' Package", description: "Our most popular package for a full refresh.", basePrice: 180, isPackage: true, isDealerPackage: false, serviceIds: [s1, s2], estimatedDurationHours: 3 });

        // Pricing Matrix
        await ctx.db.insert("pricingMatrices", {
            name: "Vehicle Size",
            appliesToServiceIds: [s1, s2, s3, s4],
            rules: [
                { id: "rule1", factor: "Sedan", adjustmentType: "fixedAmount", adjustmentValue: 0 },
                { id: "rule2", factor: "SUV", adjustmentType: "fixedAmount", adjustmentValue: 25 },
                { id: "rule3", factor: "Truck/Van", adjustmentType: "fixedAmount", adjustmentValue: 50 },
            ]
        });

        // Upcharges
        await ctx.db.insert("upcharges", { name: "Excessive Pet Hair", description: "For vehicles with abundant pet hair.", defaultAmount: 50, isPercentage: false });
        await ctx.db.insert("upcharges", { name: "Heavy Stains", description: "For deep cleaning of set-in stains.", defaultAmount: 75, isPercentage: false });

        // Checklist
        await ctx.db.insert("checklists", { name: "Interior Procedure", serviceId: s2, tasks: ["Vacuum all carpets & seats", "Wipe down all hard surfaces", "Clean interior glass", "Apply UV protectant"] });
        
        // Customers & Vehicles
        const c1 = await ctx.db.insert("customers", { name: "John Doe", email: "john.doe@example.com", phone: "555-1234" });
        await ctx.db.insert("vehicles", { customerId: c1, make: "Toyota", model: "Camry", year: 2022, vin: "123ABC456DEF" });

        const c2 = await ctx.db.insert("customers", { name: "Jane Smith", email: "jane.smith@example.com", phone: "555-5678" });
        await ctx.db.insert("vehicles", { customerId: c2, make: "Ford", model: "F-150", year: 2021, vin: "789GHI012JKL" });

        // Inventory
        const sup1 = await ctx.db.insert("suppliers", { name: "Chemical Guys" });
        await ctx.db.insert("products", { name: "All-Purpose Cleaner", category: "Chemicals", supplierId: sup1, stockLevel: 20, reorderPoint: 5 });
        await ctx.db.insert("products", { name: "Microfiber Towels (12-pack)", category: "Supplies", supplierId: sup1, stockLevel: 50, reorderPoint: 10 });
        
        // Promotions
        await ctx.db.insert("promotions", { code: "NEW20", type: "percentage", value: 20, isActive: true });
        
        console.log("Database seeded successfully!");
    }
});
