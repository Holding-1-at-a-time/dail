

import { Doc, Id } from "./convex/_generated/dataModel";

export type Service = Doc<"services"> & {
  productsUsed?: { productId: Id<'products'>, quantity: number }[];
};
export type PricingRule = Doc<"pricingMatrices">["rules"][number];
export type PricingMatrix = Doc<"pricingMatrices">;
export type Upcharge = Doc<"upcharges">;
export type Checklist = Doc<"checklists">;
export type Vehicle = Doc<"vehicles">;
export type Customer = Doc<"customers">;
export type JobItem = Doc<"jobs">["jobItems"][number];
export type Payment = Doc<"jobs">["payments"][number];
export type JobPhoto = Doc<"jobs">["photos"][number];
export type Job = Doc<"jobs"> & {
    inventoryDebited?: boolean;
};
export type Appointment = Doc<"appointments"> & {
    reminderSentAt?: number;
    reminderWorkflowId?: string;
};
export type User = Doc<"users">;
export type Company = Doc<"company"> & {
    enableSmartInventory?: boolean;
    businessHours?: {
        [day: string]: { start: string; end: string; enabled: boolean } | undefined;
    };
    bookingLeadTimeDays?: number;
    slotDurationMinutes?: number;
    enableEmailReminders?: boolean;
    brandColor?: string;
    logoStorageId?: Id<'_storage'>;
    stripeConnectStatus?: 'none' | 'in_progress' | 'complete' | 'needs_attention';
    onboardingCompleted?: boolean;
};
export type Supplier = Doc<"suppliers"> & {
    estimatedLeadTimeDays?: number;
};
export type Product = Doc<"products"> & {
    lastCostPerUnit?: number;
    unit?: string;
    predictedDepletionDate?: number;
    dailyConsumptionRate?: number;
    barcode?: string;
};
export type Promotion = Doc<"promotions">;
export type Campaign = Doc<"campaigns"> & {
    status: 'generating' | 'complete' | 'failed' | 'sending' | 'sent';
    sentAt?: number;
};
export type InventoryLog = Doc<"inventoryLog">;
export type Notification = Doc<"notifications">;
export type LearnedProductServiceMapping = Doc<"learnedProductServiceMapping">;
export type CommunicationLog = Doc<"communicationLogs">;
export type Subscription = Doc<"subscriptions">;
export type AuditLog = Doc<"auditLogs">;
export type Snapshot = Doc<"snapshots">;

export type Page = 'dashboard' | 'management' | 'schedule' | 'settings' | 'reports' | 'inventory' | 'marketing' | 'knowledge-base' | 'assistant';