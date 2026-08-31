/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as approvals from "../approvals.js";
import type * as audit from "../audit.js";
import type * as campaigns from "../campaigns.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as followUpTasks from "../followUpTasks.js";
import type * as growth from "../growth.js";
import type * as journey from "../journey.js";
import type * as meta from "../meta.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as seed from "../seed.js";
import type * as socialAccounts from "../socialAccounts.js";
import type * as team from "../team.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  approvals: typeof approvals;
  audit: typeof audit;
  campaigns: typeof campaigns;
  comments: typeof comments;
  crons: typeof crons;
  files: typeof files;
  followUpTasks: typeof followUpTasks;
  growth: typeof growth;
  journey: typeof journey;
  meta: typeof meta;
  notifications: typeof notifications;
  posts: typeof posts;
  seed: typeof seed;
  socialAccounts: typeof socialAccounts;
  team: typeof team;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
