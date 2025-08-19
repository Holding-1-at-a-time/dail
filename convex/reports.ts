import { v } from 'convex/values';
import { query } from './_generated/server';
import { servicePerformanceAggregate, technicianPerformanceAggregate, jobStats } from './aggregates';
import { Id } from './_generated/dataModel';

export const getReportsData = query({
    args: {
        startDate: v.number(),
        endDate: v.number(),
        technicianId: v.string(),
    },
    handler: async (ctx, { startDate, endDate, technicianId }) => {
        // --- Revenue Over Time ---
        const paginatedJobs = await jobStats.paginate(ctx, {
            bounds: {
                lower: { key: ['completed', startDate], inclusive: true },
                upper: { key: ['completed', endDate], inclusive: true },
            }
        });

        const dailyRevenue: { [key: string]: number } = {};
        for (const { key, sumValue } of paginatedJobs.page) {
            const date = new Date(key[1]).toISOString().split('T')[0];
            dailyRevenue[date] = (dailyRevenue[date] || 0) + (sumValue ?? 0);
        }
        const sortedDates = Object.keys(dailyRevenue).sort();
        const revenueOverTime = {
            labels: sortedDates,
            data: sortedDates.map(date => dailyRevenue[date])
        };
        
        // --- Service Performance ---
        const allServices = await ctx.db.query('services').collect();
        const servicePerfData = await Promise.all(allServices.map(async (service) => {
            const bounds = {
                lower: { key: [service._id, startDate] as [Id<"services">, number], inclusive: true },
                upper: { key: [service._id, endDate] as [Id<"services">, number], inclusive: true },
            };
            const [count, revenue] = await Promise.all([
                servicePerformanceAggregate.count(ctx, { bounds, namespace: undefined }),
                servicePerformanceAggregate.sum(ctx, { bounds, namespace: undefined }),
            ]);
            return { service, count, revenue };
        }));
        const servicePerformance = servicePerfData
            .filter(item => item.count > 0)
            .sort((a,b) => b.revenue - a.revenue);

        // --- Technician Leaderboard ---
        const allTechnicians = await ctx.db.query('users').filter(q => q.eq(q.field('role'), 'technician')).collect();
        const techLeaderboardData = await Promise.all(allTechnicians.map(async (technician) => {
             const bounds = {
                lower: { key: [technician._id, startDate] as [Id<"users">, number], inclusive: true },
                upper: { key: [technician._id, endDate] as [Id<"users">, number], inclusive: true },
            };
            const [completedJobs, revenue] = await Promise.all([
                technicianPerformanceAggregate.count(ctx, { bounds, namespace: undefined }),
                technicianPerformanceAggregate.sum(ctx, { bounds, namespace: undefined }),
            ]);
            return {
                technician,
                completedJobs,
                revenue,
                averageJobValue: completedJobs > 0 ? revenue / completedJobs : 0
            };
        }));
        
        const technicianLeaderboard = techLeaderboardData
            .filter(item => item.completedJobs > 0)
            .sort((a, b) => b.revenue - a.revenue);
        
        const finalLeaderboard = technicianId === 'all'
            ? technicianLeaderboard
            : technicianLeaderboard.filter(item => item.technician._id === technicianId);

        return { 
            revenueOverTime, 
            servicePerformance, 
            technicianLeaderboard: finalLeaderboard, 
            technicians: allTechnicians 
        };
    }
});

export const getVehicleHistory = query({
    args: { query: v.string() },
    handler: async (ctx, { query }) => {
        // This is a simplified search. A real implementation might use a more robust search index.
        const lowerQuery = query.toLowerCase();
        const allVehicles = await ctx.db.query('vehicles').collect();
        const allCustomers = await ctx.db.query('customers').collect();
        
        const vehicle = allVehicles.find(v => 
            v.vin.toLowerCase().includes(lowerQuery) ||
            v.make.toLowerCase().includes(lowerQuery) ||
            v.model.toLowerCase().includes(lowerQuery) ||
            (allCustomers.find(c => c._id === v.customerId)?.name.toLowerCase().includes(lowerQuery))
        );
        if (!vehicle) return null;
        
        const jobs = await ctx.db.query('jobs').withIndex('by_customer', q => q.eq('customerId', vehicle.customerId)).filter(q => q.eq(q.field('vehicleId'), vehicle._id)).order('desc').collect();
        const allServices = await ctx.db.query('services').collect();
        const jobsWithServices = jobs.map(job => ({
            ...job,
            serviceNames: job.jobItems.map(item => allServices.find(s => s._id === item.serviceId)?.name || 'Unknown')
        }));

        const customer = allCustomers.find(c => c._id === vehicle.customerId);
        
        return {
            vehicle,
            customerName: customer?.name || 'Unknown',
            jobs: jobsWithServices
        };
    }
});