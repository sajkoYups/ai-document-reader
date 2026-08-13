"use client";

import { useEffect, useState } from "react";

interface UsageData {
  totalTokens: number;
  totalCalls: number;
  breakdown: Array<{ callType: string; tokens: number; calls: number }>;
  activity: Array<{ day: string; tokens: number }>;
}

type Status = "loading" | "loaded" | "error";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[--clerk-border] bg-[--clerk-bg-surface-2] px-4 py-3 space-y-0.5">
      <p className="text-xs text-[--clerk-text-tertiary] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[--clerk-text-primary] leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[--clerk-text-secondary]">{sub}</p>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function UsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage/me")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setData(json as UsageData);
          setStatus("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="py-8 text-center text-sm text-[--clerk-text-tertiary]">
        Loading usage data…
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="py-8 text-center text-sm text-[--clerk-text-tertiary]">
        Could not load usage data. Please try again later.
      </div>
    );
  }

  const analyzeBreakdown = data.breakdown.find((b) => b.callType === "analyze");
  const chatBreakdown = data.breakdown.find((b) => b.callType === "chat");

  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-base font-semibold text-[--clerk-text-primary] mb-1">
          Deep Analysis usage
        </h2>
        <p className="text-sm text-[--clerk-text-secondary]">
          Token counts are estimates based on document and response length.
          Only Deep Analysis (server-side) calls are tracked — local on-device
          processing is never sent to our servers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total tokens used"
          value={formatTokens(data.totalTokens)}
          sub={`${data.totalTokens.toLocaleString()} tokens`}
        />
        <StatCard
          label="Total API calls"
          value={String(data.totalCalls)}
          sub="Analyze + Ask"
        />
      </div>

      {data.breakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[--clerk-text-tertiary]">
            Breakdown by type
          </p>
          <div className="rounded-xl border border-[--clerk-border] overflow-hidden">
            {[
              {
                label: "Analyze",
                data: analyzeBreakdown,
                icon: "📄",
              },
              {
                label: "Ask",
                data: chatBreakdown,
                icon: "💬",
              },
            ]
              .filter((row) => row.data)
              .map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i < arr.length - 1
                      ? "border-b border-[--clerk-border]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-2 text-[--clerk-text-secondary]">
                    <span>{row.icon}</span>
                    {row.label}
                  </span>
                  <span className="font-medium text-[--clerk-text-primary]">
                    {formatTokens(row.data!.tokens)} tokens &middot;{" "}
                    {row.data!.calls} calls
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {data.activity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[--clerk-text-tertiary]">
            Last 30 days
          </p>
          <MiniChart activity={data.activity} />
        </div>
      )}

      {data.totalCalls === 0 && (
        <div className="rounded-xl border border-[--clerk-border] px-4 py-6 text-center">
          <p className="text-sm text-[--clerk-text-secondary]">
            No Deep Analysis calls yet. Switch to Deep Analysis mode in the app
            and run your first analysis to see usage here.
          </p>
        </div>
      )}

      <p className="text-xs text-[--clerk-text-tertiary]">
        Your documents and prompts are never stored. Only aggregate token counts
        are recorded for billing purposes.
      </p>
    </div>
  );
}

function MiniChart({
  activity,
}: {
  activity: Array<{ day: string; tokens: number }>;
}) {
  const max = Math.max(...activity.map((a) => a.tokens), 1);

  return (
    <div className="rounded-xl border border-[--clerk-border] px-4 py-4">
      <div className="flex items-end gap-1 h-16">
        {activity.map((a) => {
          const height = Math.max((a.tokens / max) * 100, 4);
          return (
            <div
              key={a.day}
              className="flex-1 min-w-0 rounded-sm bg-[--clerk-color-primary] opacity-70 hover:opacity-100 transition-opacity"
              style={{ height: `${height}%` }}
              title={`${a.day}: ${a.tokens.toLocaleString()} tokens`}
            />
          );
        })}
      </div>
      <p className="text-xs text-[--clerk-text-tertiary] mt-2 text-center">
        Daily token usage (last 30 days)
      </p>
    </div>
  );
}
