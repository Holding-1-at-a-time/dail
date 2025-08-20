import { log } from 'console';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    role: v.union(v.literal('admin'), v.literal('technician')),
  }).index('by_clerk_id', ['clerkId']),

  company: defineTable({
    name: v.string(),
    logoStorageId: v.optional(v.id('_storage')),
    brandColor: v.optional(v.string()),
    defaultLaborRate: v.number(),
    stripeAccountId: v.optional(v.string()),
    stripeConnectStatus: v.optional(v.union(v.literal('none'), v.literal('in_progress'), v.literal('complete'), v.literal('needs_attention'))),
    enableSmartInventory: v.optional(v.boolean()),
    businessHours: v.optional(v.object({
        monday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        tuesday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        wednesday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        thursday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        friday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        saturday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
        sunday: v.optional(v.object({ start: v.string(), end: v.string(), enabled: v.boolean() })),
    })),
    bookingLeadTimeDays: v.optional(v.number()),
    slotDurationMinutes: v.optional(v.number()),
    enableEmailReminders: v.optional(v.boolean()),
  }),

  services: defineTable({
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    isPackage: v.boolean(),
    serviceIds: v.array(v.id('services')),
    isDealerPackage: v.boolean(),
    estimatedDurationHours: v.optional(v.number()),
    productsUsed: v.optional(v.array(v.object({
        productId: v.id('products'),
        quantity: v.number(),
    }))),
  }).searchIndex('search_name', { searchField: 'name' }),

  pricingMatrices: defineTable({
    name: v.string(),
    appliesToServiceIds: v.array(v.id('services')),
    rules: v.array(v.object({
      id: v.string(),
      factor: v.string(),
      adjustmentType: v.union(v.literal('percentage'), v.literal('fixedAmount')),
      adjustmentValue: v.number(),
    })),
  }),

  upcharges: defineTable({
    name: v.string(),
    description: v.string(),
    defaultAmount: v.number(),
    isPercentage: v.boolean(),
  }),

  checklists: defineTable({
    name: v.string(),
    serviceId: v.id('services'),
    tasks: v.array(v.string()),
  }),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  }).index('by_email', ['email']),

  vehicles: defineTable({
    customerId: v.id('customers'),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
  }).index('by_customer', ['customerId'])
    .searchIndex("search_vin_make_model", { searchField: "vin" }),

  jobs: defineTable({
    customerId: v.id('customers'),
    vehicleId: v.id('vehicles'),
    status: v.union(v.literal('estimate'), v.literal('workOrder'), v.literal('invoice'), v.literal('completed'), v.literal('cancelled')),
    estimateDate: v.number(),
    workOrderDate: v.optional(v.number()),
    invoiceDate: v.optional(v.number()),
    completionDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    totalAmount: v.number(),
    paymentReceived: v.number(),
    paymentStatus: v.union(v.literal('unpaid'), v.literal('partial'), v.literal('paid')),
    jobItems: v.array(v.object({
        id: v.string(),
        serviceId: v.id('services'),
        quantity: v.number(),
        unitPrice: v.number(),
        appliedPricingRuleIds: v.array(v.string()),
        addedUpchargeIds: v.array(v.id('upcharges')),
        total: v.number(),
        checklistCompletedItems: v.optional(v.array(v.string())),
    })),
    payments: v.optional(v.array(v.object({
        id: v.string(),
        amount: v.number(),
        paymentDate: v.number(),
        method: v.union(v.literal('Cash'), v.literal('Credit Card'), v.literal('Check'), v.literal('Bank Transfer'), v.literal('Other')),
        notes: v.optional(v.string()),
    }))),
    assignedTechnicianIds: v.optional(v.array(v.id('users'))),
    photos: v.optional(v.array(v.object({
        id: v.string(),
        storageId: v.id('_storage'),
        type: v.union(v.literal('before'), v.literal('after')),
        timestamp: v.number(),
    }))),
    customerApprovalStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    customerSignatureStorageId: v.optional(v.id('_storage')),
    approvalTimestamp: v.optional(v.number()),
    appliedPromotionId: v.optional(v.id('promotions')),
    discountAmount: v.optional(v.number()),
    publicLinkKey: v.optional(v.string()),
    visualQuoteStatus: v.optional(v.union(v.literal('pending'), v.literal('complete'), v.literal('failed'))),
    visualQuoteStorageIds: v.optional(v.array(v.id('_storage'))),
    inventoryDebited: v.optional(v.boolean()),
    actualStartTime: v.optional(v.number()),
    actualEndTime: v.optional(v.number()),
  }).index('by_customer', ['customerId']).index('by_public_link_key', ['publicLinkKey']),

  appointments: defineTable({
    jobId: v.id('jobs'),
    startTime: v.number(),
    endTime: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.union(v.literal('scheduled'), v.literal('inProgress'), v.literal('completed'), v.literal('cancelled'))),
    reminderSentAt: v.optional(v.number()),
    reminderWorkflowId: v.optional(v.string()),
  }).index('by_job', ['jobId']),

  suppliers: defineTable({
    name: v.string(),
    contactEmail: v.optional(v.string()),
    estimatedLeadTimeDays: v.optional(v.number()),
  }),

  products: defineTable({
    name: v.string(),
    category: v.string(),
    supplierId: v.id('suppliers'),
    stockLevel: v.number(),
    reorderPoint: v.number(),
    unit: v.optional(v.string()), // e.g., 'bottle', 'gallon', 'unit'
    lastCostPerUnit: v.optional(v.number()),
    predictedDepletionDate: v.optional(v.number()),
    dailyConsumptionRate: v.optional(v.number()),
    barcode: v.optional(v.string()),
  }).index('by_barcode', ['barcode']),
  
  inventoryLog: defineTable({
    productId: v.id('products'),
    change: v.number(),
    newStockLevel: v.number(),
    type: v.union(v.literal('received'), v.literal('job_deduction'), v.literal('manual_adjustment')),
    jobId: v.optional(v.id('jobs')),
    costPerUnit: v.optional(v.number()),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  }).index('by_product', ['productId']),

  promotions: defineTable({
    code: v.string(),
    type: v.union(v.literal('percentage'), v.literal('fixedAmount')),
    value: v.number(),
    isActive: v.boolean(),
  }),

  campaigns: defineTable({
    goal: v.string(),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    createdAt: v.number(),
    status: v.union(v.literal('generating'), v.literal('complete'), v.literal('failed'), v.literal('sending'), v.literal('sent')),
    sentAt: v.optional(v.number()),
  }),
  
  notifications: defineTable({
    productId: v.id('products'),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    timestamp: v.number(),
  }).index('by_read_status', ['isRead']),

  learnedProductServiceMapping: defineTable({
    serviceId: v.id('services'),
    productId: v.id('products'),
    associationScore: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_service_product", ["serviceId", "productId"])
   .index("by_service", ["serviceId"]),
  
  // Tables for @convex-dev/agent
  threads: defineTable({}),
  messages: defineTable({
    threadId: v.id("threads"),
    role: v.string(), // "user", "assistant", or "tool"
    content: v.string(), // The text content of the message, or tool results
    toolCallId: v.optional(v.string()),
    toolCalls: v.optional(v.any()),
  }).index("by_threadId", ["threadId"]),
  
  communicationLogs: defineTable({
    jobId: v.id('jobs'),
    type: v.union(v.literal('automated_reminder'), v.literal('manual_message')),
    method: v.literal('email'),
    content: v.string(),
    timestamp: v.number(),
  }).index('by_job', ['jobId']),
  
  subscriptions: defineTable({
    customerId: v.id('customers'),
    serviceIds: v.array(v.id('services')),
    frequency: v.union(v.literal('weekly'), v.literal('biweekly'), v.literal('monthly'), v.literal('quarterly'), v.literal('yearly')),
    price: v.number(),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('cancelled')),
    startDate: v.number(),
    nextDueDate: v.number(),
  }).index('by_customer', ['customerId']).index('by_next_due_date', ['nextDueDate']),

  auditLogs: defineTable({
    userId: v.id('users'),
    userName: v.string(),
    action: v.string(),
    details: v.object({
      targetId: v.optional(v.string()),
      targetName: v.optional(v.string()),
      extra: v.optional(v.any()),
    }),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  snapshots: defineTable({
    name: v.string(),
    createdBy: v.string(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});

