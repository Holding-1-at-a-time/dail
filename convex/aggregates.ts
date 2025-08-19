import { TableAggregate, DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { DataModel, Doc, Id } from "./_generated/dataModel";

// Aggregate for total customer count.
export const customerCount = new TableAggregate<{
  Key: null; // No sorting key needed for a simple total count.
  DataModel: DataModel;
  TableName: "customers";
}>(components.customerCount, {
  sortKey: () => null,
});

type JobStatus = "estimate" | "workOrder" | "invoice" | "completed" | "cancelled";

// Aggregate for job statistics.
export const jobStats = new TableAggregate<{
  Key: [JobStatus, number]; // Sort by status, then completion/creation time.
  DataModel: DataModel;
  TableName: "jobs";
}>(components.jobStats, {
  sortKey: (doc) => [doc.status, doc.completionDate ?? doc._creationTime],
  // Only sum the revenue for jobs that are marked 'completed'.
  sumValue: (doc) => (doc.status === 'completed' ? doc.totalAmount : 0),
});

// Aggregate for low stock item count.
export const productStockStatusAggregate = new TableAggregate<{
  Key: 0 | 1; // 0 for in-stock, 1 for low-stock
  DataModel: DataModel;
  TableName: "products";
}>(components.productStockStatus, {
  sortKey: (doc) => (doc.stockLevel <= doc.reorderPoint ? 1 : 0),
});

// Aggregate for service performance reporting.
export const servicePerformanceAggregate = new DirectAggregate<{
  Key: [Id<"services">, number]; // [serviceId, completionDate]
  Id: string; // Use job ID + item ID to ensure uniqueness
}>(components.servicePerformance);

// Aggregate for technician performance reporting.
export const technicianPerformanceAggregate = new DirectAggregate<{
  Key: [Id<"users">, number]; // [technicianId, completionDate]
  Id: string; // Use job ID + tech ID
}>(components.technicianPerformance);