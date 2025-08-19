import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Schedule a cron to run every day to clean up old, replaced RAG entries.
crons.daily(
  "deleteReplacedRAGEntries",
  { hourUTC: 8, minuteUTC: 0 }, // Run at 8:00 AM UTC
  internal.rag_cleanup.deleteOldContent,
);

// Schedule daily inventory forecasting.
crons.daily(
  "runInventoryForecasting",
  { hourUTC: 2, minuteUTC: 0 }, // Run at 2:00 AM UTC
  internal.inventory.runForecastingForAllProducts,
);

// Schedule daily low-stock alert generation.
crons.daily(
  "generateLowStockAlerts",
  { hourUTC: 3, minuteUTC: 0 }, // Run at 3:00 AM UTC
  internal.inventory.generateLowStockAlerts,
);

// Schedule hourly appointment reminder checks.
crons.hourly(
  "dispatchAppointmentReminders",
  { minuteUTC: 0 }, // Run at the top of every hour
  internal.communication.dispatchReminderWorkflows,
);

// Schedule daily check for recurring jobs.
crons.daily(
  "generateRecurringJobs",
  { hourUTC: 4, minuteUTC: 0 }, // Run at 4:00 AM UTC
  internal.subscriptions.generateRecurringJobs,
);


export default crons;