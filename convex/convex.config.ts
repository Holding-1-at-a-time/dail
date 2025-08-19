// convex/convex.config.ts
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config";
import actionCache from "@convex-dev/action-cache/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";

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