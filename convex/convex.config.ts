// convex/convex.config.ts
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/server";
import actionCache from "@convex-dev/action-cache/server";
import aggregate from "@convex-dev/aggregate/server";
import agent from "@convex-dev/agent/server";
import rateLimiter from "@convex-dev/rate-limiter/server";
import workflow from "@convex-dev/workflow/server";
import workpool from "@convex-dev/workpool/server";

const app = defineApp();
app.use(rag);
app.use(actionCache);
app.use(aggregate, { name: "customerCount" });
app.use(aggregate, { name: "jobStats" });
app.use(aggregate, { name: "productStockStatus" });
app.use(aggregate, { name: "servicePerformance" });
app.use(aggregate, { name: "technicianPerformance" });
app.use(agent);
app.use(rateLimiter);

// Priority-based workflow pools
app.use(workflow, { name: "highPriorityWorkflow" });
app.use(workflow, { name: "defaultPriorityWorkflow" });
app.use(workflow, { name: "lowPriorityWorkflow" });

// Dedicated workpool for RAG processing
app.use(workpool, { name: "ragWorkpool" });


export default app;