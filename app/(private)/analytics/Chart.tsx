import Link from "next/link";
import type { AnalyticsRow } from "./AnalyticsOverview";

function engagement(analytics: AnalyticsRow["analytics"]) {
  if (!analytics) return 0;
  return analytics.likes + analytics.comments + analytics.shares;
}

export default function Chart({ rows }: { rows: AnalyticsRow[] }) {
  const max = Math.max(0, ...rows.map((row) => engagement(row.analytics)));

  return (
    <section className="glass-card mt-6 rounded-3xl p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3556d9]">
          Post comparison
        </p>
        <h2 className="mt-1 text-xl font-semibold">Engagement by post</h2>
      </div>
      <div className="mt-8 space-y-7">
        {rows.map(({ post, analytics }) => {
          const total = engagement(analytics);
          const width = max
            ? Math.max((total / max) * 100, total ? 4 : 0)
            : 0;
          return (
            <Link
              key={post._id}
              href={`/posts/${post._id}`}
              className="grid gap-3 rounded-xl sm:grid-cols-[10rem_1fr_5rem] sm:items-center hover:bg-blue-50/40"
              title="Open this post to refresh its analytics"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {post.content}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(
                    post.publishedAt ?? post.createdAt,
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-blue-50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#173b9a] to-[#6b84ff]"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-right text-sm font-semibold">
                {total.toLocaleString()}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
