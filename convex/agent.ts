import { z } from 'zod';
import { Agent, createTool } from '@convex-dev/agent';
import { api, internal, components } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { openai } from '@ai-sdk/openai';
import { internalQuery, internalAction, internalMutation } from './_generated/server';

// --- Tool Definitions for the AI Assistant ---

const getAppointments = createTool({
    description: "Get a list of scheduled appointments within a given date range.",
    args: z.object({
        startDate: z.string().describe("The start date for the query in ISO 8601 format."),
        endDate: z.string().describe("The end date for the query in ISO 8601 format."),
    }),
    handler: async (ctx, { startDate, endDate }) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        const appointments = await ctx.runQuery(internal.agent.getAppointmentsInRange, { start, end });
        
        if (appointments.length === 0) {
            return "No appointments found in that date range.";
        }
        
        return `Found ${appointments.length} appointments:\n` + appointments.map(a => 
            `- Job for ${a.customerName} (${a.vehicleDescription}) from ${new Date(a.startTime).toLocaleString()} to ${new Date(a.endTime).toLocaleString()}`
        ).join('\n');
    },
});

const findCustomer = createTool({
    description: "Find a customer's contact information by their name.",
    args: z.object({
        name: z.string().describe("The full or partial name of the customer to search for."),
    }),
    handler: async (ctx, { name }) => {
        const customer = await ctx.runQuery(internal.agent.findCustomerByName, { name });
        if (!customer) {
            return `No customer found with the name "${name}".`;
        }
        return `Customer Found: ${customer.name}, Phone: ${customer.phone}, Email: ${customer.email}.`;
    },
});

const getJobStatus = createTool({
    description: "Get the current status of a specific job.",
    args: z.object({
        customerName: z.string().describe("The name of the customer associated with the job."),
        vehicleIdentifier: z.string().describe("A description of the vehicle, e.g., 'Toyota Camry' or 'the Ford truck'."),
    }),
    handler: async (ctx, { customerName, vehicleIdentifier }) => {
        const job = await ctx.runQuery(internal.agent.findJobByDetails, { customerName, vehicleIdentifier });
        if (!job) {
            return `Could not find a recent job for ${customerName}'s ${vehicleIdentifier}.`;
        }
        return `The job for ${customerName}'s ${vehicleIdentifier} is currently in status: ${job.status}. The total amount is $${job.totalAmount.toFixed(2)}.`;
    }
});

const getInventoryLevel = createTool({
    description: "Check the current stock level for a specific product in inventory.",
    args: z.object({
        productName: z.string().describe("The name of the product to check."),
    }),
    handler: async (ctx, { productName }) => {
        const product = await ctx.runQuery(internal.agent.findProductByName, { productName });
        if (!product) {
            return `Product "${productName}" not found in inventory.`;
        }
        return `There are ${product.stockLevel} units of ${product.name} left in stock.`;
    }
});

const scheduleJob = createTool({
    description: "Schedule a new job for a customer. This involves finding the customer, vehicle, and service, then finding an available time slot and creating the job and appointment.",
    args: z.object({
        customerName: z.string().describe("The full name of the customer."),
        vehicleIdentifier: z.string().describe("A description of the vehicle (e.g., 'Toyota Camry', 'F-150')."),
        serviceName: z.string().describe("The name of the service to be performed (e.g., 'Basic Wash')."),
        desiredTimeframe: z.string().describe("The user's desired time for the appointment (e.g., 'tomorrow afternoon', 'next Tuesday', 'sometime next week')."),
    }),
    handler: async (ctx, { customerName, vehicleIdentifier, serviceName, desiredTimeframe }) => {
        const result = await ctx.runAction(internal.agent.scheduleJobAction, { customerName, vehicleIdentifier, serviceName, desiredTimeframe });
        return result;
    }
});


// --- Agent Definition ---

export const agent = new Agent(components.agent, {
  name: "assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "You are an expert assistant for an auto detailing business. You are helpful, friendly, and efficient. When a user asks to schedule a job, you MUST use the `scheduleJob` tool. Do not try to schedule it manually. If information is missing, ask for it. When asked about schedules, use the `getAppointments` tool.",
  tools: {
    getAppointments,
    findCustomer,
    getJobStatus,
    getInventoryLevel,
    scheduleJob,
  },
});

// --- Internal helpers for tools ---

export const getAppointmentsInRange = internalQuery(async (ctx, { start, end }: { start: number; end: number }) => {
  const appointments = await ctx.db.query('appointments').filter(q => q.and(q.gte(q.field('startTime'), start), q.lte(q.field('startTime'), end))).collect();
  const appointmentsWithDetails = await Promise.all(
    appointments.map(async (appt) => {
      const job = await ctx.db.get(appt.jobId);
      if (!job) return null;
      const customer = await ctx.db.get(job.customerId);
      const vehicle = await ctx.db.get(job.vehicleId);
      return {
        ...appt,
        customerName: customer?.name ?? 'Unknown Customer',
        vehicleDescription: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle',
      };
    })
  );
  return appointmentsWithDetails.filter((a): a is NonNullable<typeof a> => a !== null);
});


export const findCustomerByName = internalQuery(async (ctx, { name }: { name: string }) => {
  const customers = await ctx.db.query('customers').collect();
  return customers.find(c => c.name.toLowerCase().includes(name.toLowerCase())) || null;
});

export const findJobByDetails = internalQuery(async (ctx, { customerName, vehicleIdentifier }: { customerName: string; vehicleIdentifier: string }) => {
  const customer = await findCustomerByName(ctx, { name: customerName });
  if (!customer) return null;
  
  const vehicles = await ctx.db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', customer._id)).collect();
  const lowerVehicleIdentifier = vehicleIdentifier.toLowerCase();
  const vehicle = vehicles.find(v => 
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(lowerVehicleIdentifier) ||
      v.make.toLowerCase().includes(lowerVehicleIdentifier) ||
      v.model.toLowerCase().includes(lowerVehicleIdentifier)
  );
  if (!vehicle) return null;

  return await ctx.db.query('jobs')
    .withIndex('by_customer', q => q.eq('customerId', customer._id))
    .filter(q => q.eq(q.field('vehicleId'), vehicle._id))
    .order('desc')
    .first();
});

export const findProductByName = internalQuery(async (ctx, { productName }: { productName: string }) => {
    const products = await ctx.db.query('products').collect();
    return products.find(p => p.name.toLowerCase().includes(productName.toLowerCase())) || null;
});

export const scheduleJobAction = internalAction({
    args: {
        customerName: z.string(),
        vehicleIdentifier: z.string(),
        serviceName: z.string(),
        desiredTimeframe: z.string(),
    },
    handler: async (ctx, { customerName, vehicleIdentifier, serviceName, desiredTimeframe }) => {
        let customer = await ctx.runQuery(internal.agent.findCustomerByName, { name: customerName });
        if (!customer) {
            return `I couldn't find a customer named "${customerName}". Please create the customer first.`;
        }

        const vehicles = await ctx.runQuery(internal.agent.getVehiclesForCustomer, { customerId: customer._id });
        const lowerVehicleIdentifier = vehicleIdentifier.toLowerCase();
        const vehicle = vehicles.find(v => 
            `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(lowerVehicleIdentifier) ||
            v.make.toLowerCase().includes(lowerVehicleIdentifier) ||
            v.model.toLowerCase().includes(lowerVehicleIdentifier)
        );
        if (!vehicle) {
            return `I couldn't find a vehicle matching "${vehicleIdentifier}" for ${customerName}. Please add the vehicle to the customer's profile.`;
        }
        
        const service = await ctx.runQuery(internal.agent.findServiceByName, { serviceName });
        if (!service) {
            return `I couldn't find a service called "${serviceName}".`;
        }
        
        const jobId = await ctx.runMutation(internal.agent.createJobForScheduling, {
            customerId: customer._id,
            vehicleId: vehicle._id,
            serviceId: service._id,
        });

        const slots = await ctx.runAction(api.ai.suggestAppointmentSlots, { jobId });
        if (!slots || slots.length === 0) {
            return "I couldn't find any available appointment slots for that timeframe. Please try a different time.";
        }
        const bestSlot = slots[0];

        await ctx.runMutation(api.appointments.save, {
            jobId,
            startTime: new Date(bestSlot.startTime).getTime(),
            endTime: new Date(bestSlot.endTime).getTime(),
            status: 'scheduled',
            description: `Scheduled by AI Assistant for timeframe: ${desiredTimeframe}`,
        });
        
        return `OK, I've scheduled a "${service.name}" for ${customer.name}'s ${vehicle.year} ${vehicle.make} ${vehicle.model}. The appointment is set for ${new Date(bestSlot.startTime).toLocaleString()}.`;
    }
});

export const getVehiclesForCustomer = internalQuery(async (ctx, { customerId }: { customerId: Id<"customers"> }) => {
    return ctx.db.query('vehicles').withIndex('by_customer', q => q.eq('customerId', customerId)).collect();
});

export const findServiceByName = internalQuery(async (ctx, { serviceName }: { serviceName: string }) => {
    const services = await ctx.db.query('services').collect();
    return services.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase())) || null;
});

export const createJobForScheduling = internalMutation(async (ctx, { customerId, vehicleId, serviceId }: { customerId: Id<"customers">, vehicleId: Id<"vehicles">, serviceId: Id<"services"> }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) throw new Error("Service not found");
    
    const jobItem = {
        id: `item_${Date.now()}`,
        serviceId: service._id,
        quantity: 1,
        unitPrice: service.basePrice,
        appliedPricingRuleIds: [],
        addedUpchargeIds: [],
        total: service.basePrice,
    };
    
    return await ctx.db.insert('jobs', {
        customerId,
        vehicleId,
        status: 'workOrder',
        estimateDate: Date.now(),
        workOrderDate: Date.now(),
        totalAmount: service.basePrice,
        paymentReceived: 0,
        paymentStatus: 'unpaid',
        jobItems: [jobItem],
        customerApprovalStatus: 'approved',
    });
});