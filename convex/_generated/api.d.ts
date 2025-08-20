/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agent from "../agent.js";
import type * as aggregates from "../aggregates.js";
import type * as ai from "../ai.js";
import type * as appointments from "../appointments.js";
import type * as auditLog from "../auditLog.js";
import type * as booking from "../booking.js";
import type * as cache from "../cache.js";
import type * as chat from "../chat.js";
import type * as checklists from "../checklists.js";
import type * as communication from "../communication.js";
import type * as company from "../company.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dataManagement from "../dataManagement.js";
import type * as dev from "../dev.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as jobs from "../jobs.js";
import type * as learning from "../learning.js";
import type * as management from "../management.js";
import type * as marketing from "../marketing.js";
import type * as notifications from "../notifications.js";
import type * as pricing from "../pricing.js";
import type * as rag from "../rag.js";
import type * as rag_cleanup from "../rag_cleanup.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as reports from "../reports.js";
import type * as retrier from "../retrier.js";
import type * as services from "../services.js";
import type * as subscriptions from "../subscriptions.js";
import type * as suppliers from "../suppliers.js";
import type * as users from "../users.js";
import type * as whiteLabel from "../whiteLabel.js";
import type * as workflows from "../workflows.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  aggregates: typeof aggregates;
  ai: typeof ai;
  appointments: typeof appointments;
  auditLog: typeof auditLog;
  booking: typeof booking;
  cache: typeof cache;
  chat: typeof chat;
  checklists: typeof checklists;
  communication: typeof communication;
  company: typeof company;
  crons: typeof crons;
  customers: typeof customers;
  dataManagement: typeof dataManagement;
  dev: typeof dev;
  files: typeof files;
  http: typeof http;
  inventory: typeof inventory;
  jobs: typeof jobs;
  learning: typeof learning;
  management: typeof management;
  marketing: typeof marketing;
  notifications: typeof notifications;
  pricing: typeof pricing;
  rag: typeof rag;
  rag_cleanup: typeof rag_cleanup;
  rateLimiter: typeof rateLimiter;
  reports: typeof reports;
  retrier: typeof retrier;
  services: typeof services;
  subscriptions: typeof subscriptions;
  suppliers: typeof suppliers;
  users: typeof users;
  whiteLabel: typeof whiteLabel;
  workflows: typeof workflows;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
