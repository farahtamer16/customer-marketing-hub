import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "publish due scheduled posts",
  { minutes: 1 },
  internal.meta.processDuePosts,
);

crons.interval(
  "publish due scheduled comments",
  { minutes: 1 },
  internal.meta.processDueComments,
);

export default crons;
