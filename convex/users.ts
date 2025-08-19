import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { customerCount, jobStats, productStockStatusAggregate } from "./aggregates";
import { Doc, Id } from "./_generated/dataModel";

type JobStatus = "estimate" | "workOrder" | "invoice" | "completed" | "cancelled";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getByIdentity = internalQuery({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getSettingsData = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        
        const currentUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
        if (!currentUser || currentUser.role !== 'admin') {
            return { currentUser, allUsers: currentUser ? [currentUser] : [], company: null };
        }

        const allUsers = await ctx.db.query("users").collect();
        const company = await ctx.db.query("company").first();

        return { currentUser, allUsers, company };
    },
});

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!currentUser) return null;

    if (currentUser.role === "technician") {
      const allJobs = await ctx.db.query("jobs").order("desc").collect();
      const techJobs = allJobs.filter((j) =>
        j.assignedTechnicianIds?.includes(currentUser._id)
      );

      const jobsWithDetails = await Promise.all(
        techJobs.map(async (job) => {
          const customer = await ctx.db.get(job.customerId);
          const vehicle = await ctx.db.get(job.vehicleId);
          return { ...job, customer, vehicle };
        })
      );
      
      const stats = {
        activeJobs: techJobs.filter((j) =>
          ["workOrder", "invoice"].includes(j.status)
        ).length,
      };

      return {
        stats,
        jobsForDashboard: jobsWithDetails,
        adminDashboardData: null,
      };
    }

    // Admin Path
    const recentJobsForList = await ctx.db.query("jobs").order("desc").take(10);
    const jobsWithDetails = await Promise.all(
      recentJobsForList.map(async (job) => {
        const customer = await ctx.db.get(job.customerId);
        const vehicle = await ctx.db.get(job.vehicleId);
        return { ...job, customer, vehicle };
      })
    );

    // --- OPTIMIZED STATS ---
    const totalCustomers = await customerCount.count(ctx);
    const workOrderCount = await jobStats.count(ctx, { bounds: { prefix: ['workOrder'] } });
    const invoiceCount = await jobStats.count(ctx, { bounds: { prefix: ['invoice'] } });
    const activeJobs = workOrderCount + invoiceCount;
    
    const oneMonthAgoTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const lowerBoundKey: [JobStatus, number] = ['completed', oneMonthAgoTimestamp];
    const upperBoundKey: [JobStatus, number] = ['completed', Date.now()];

    const revenueThisMonth = await jobStats.sum(ctx, {
        bounds: {
            lower: { key: lowerBoundKey, inclusive: true },
            upper: { key: upperBoundKey, inclusive: true },
        }
    });
    
    const lowStockItems = await productStockStatusAggregate.count(ctx, { bounds: { prefix: [1] } });
    
    // --- Chart & Remaining Stats ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const appointmentsToday = (
      await ctx.db.query("appointments").collect()
    ).filter(
      (a) =>
        a.startTime >= todayStart.getTime() && a.startTime <= todayEnd.getTime()
    ).length;

    // Chart data still requires fetching some jobs, but this is acceptable for a top-5 chart.
    const completedJobsLastMonth = await jobStats.paginate(ctx, {
        bounds: {
            lower: { key: lowerBoundKey, inclusive: true },
            upper: { key: upperBoundKey, inclusive: true },
        }
    });

    const completedJobIds = completedJobsLastMonth.page.map(item => item._id);
    const nullableJobDocs: (Doc<"jobs"> | null)[] = await Promise.all(
      completedJobIds.map(id => ctx.db.get(id))
    );
    const jobDocs = nullableJobDocs.filter((doc): doc is Doc<"jobs"> => doc !== null);
    
    const allServices = await ctx.db.query("services").collect();
    const revenueByService: Record<string, number> = {};
    for (const job of jobDocs) {
      for (const item of job.jobItems) {
        const service = allServices.find((s) => s._id === item.serviceId);
        if (service) {
          revenueByService[service.name] = (revenueByService[service.name] || 0) + item.total;
        }
      }
    }

    const sortedRevenueByService = Object.entries(revenueByService)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const revenueByServiceChartData = {
      labels: sortedRevenueByService.map((item) => item[0]),
      data: sortedRevenueByService.map((item) => item[1]),
    };

    const stats = {
      activeJobs,
      revenueThisMonth,
      totalCustomers,
      appointmentsToday,
      lowStockItems,
    };

    return {
      stats,
      jobsForDashboard: jobsWithDetails,
      adminDashboardData: { revenueByServiceChartData },
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('technician')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (currentUser?.role !== 'admin') throw new Error("Not authorized");

    console.warn("User creation without a Clerk invitation is not fully supported.");
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('technician')),
  },
  handler: async (ctx, { id, ...rest }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (currentUser?.role !== 'admin') throw new Error("Not authorized");

    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (currentUser?.role !== 'admin') throw new Error("Not authorized");
    if (currentUser._id === id) throw new Error("Cannot delete yourself");
    
    await ctx.db.delete(id);
  },
});

// Internal mutations for Clerk webhooks
export const createOrUpdate = internalMutation({
  args: { clerkUser: v.any() },
  handler: async (ctx, { clerkUser }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUser.id))
      .unique();

    const userData = {
      name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || clerkUser.email_addresses[0].email_address,
      email: clerkUser.email_addresses[0].email_address,
      clerkId: clerkUser.id,
    };

    if (user === null) {
      const anyUser = await ctx.db.query("users").first();
      await ctx.db.insert("users", {
        ...userData,
        role: anyUser ? "technician" : "admin",
      });

      if (!anyUser) {
        await ctx.db.insert("company", {
          name: `${userData.name}'s Detailing`,
          defaultLaborRate: 75,
        });
      }
    } else {
      await ctx.db.patch(user._id, { name: userData.name, email: userData.email });
    }
  },
});

export const deleteClerkUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
