"use client";

import { useEffect, useState } from "react";
import {
  quotaNotice,
  type AnalysisQuota,
} from "@/lib/analysisQuota";

interface UsageData {
  totalTokens: number;
  totalCalls: number;
  breakdown: Array<{ callType: string; tokens: number; calls: number }>;
  activity: Array<{ day: string; tokens: number }>;
  quota?: AnalysisQuota;
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
      <p className="text-xs text-black font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-semibold text-black leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-black">{sub}</p>
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
      <div className="py-8 text-center text-sm text-black">
        Loading usage data…
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="py-8 text-center text-sm text-black">
        Could not load usage data. Please try again later.
      </div>
    );
  }

  const analyzeBreakdown = data.breakdown.find((b) => b.callType === "analyze");
  const chatBreakdown = data.breakdown.find((b) => b.callType === "chat");
  const quota = data.quota;
  const notice = quota ? quotaNotice(quota) : null;
  const includedLeft = quota
    ? Math.max(0, quota.included - quota.monthlyAnalyses)
    : 0;

  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-base font-semibold text-black mb-1">
          Deep Analysis usage
        </h2>
        <p className="text-sm text-black">
          One Deep Analysis run counts as one analysis. Follow-up questions do
          not count. Private Mode is not limited. Token counts below are
          estimates and are not the monthly allowance.
        </p>
      </div>

      {quota ? (
        <div className="rounded-xl border border-[--clerk-border] bg-[--clerk-bg-surface-2] px-4 py-3 space-y-1">
          <p className="text-xs text-black font-medium uppercase tracking-wide">
            Analyses this month
          </p>
          <p className="text-2xl font-semibold text-black leading-tight">
            {quota.monthlyAnalyses} of {quota.included}
          </p>
          <p className="text-xs text-black">
            {notice
              ? notice
              : includedLeft === 1
                ? "1 included analysis left this month."
                : `${includedLeft} included analyses left this month.`}
          </p>
        </div>
      ) : null}

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
          <p className="text-xs font-medium uppercase tracking-wide text-black">
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
                  <span className="flex items-center gap-2 text-black">
                    <span>{row.icon}</span>
                    {row.label}
                  </span>
                  <span className="font-medium text-black">
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
          <p className="text-xs font-medium uppercase tracking-wide text-black">
            Last 30 days
          </p>
          <MiniChart activity={data.activity} />
        </div>
      )}

      {data.totalCalls === 0 && (
        <div className="rounded-xl border border-[--clerk-border] px-4 py-6 text-center">
          <p className="text-sm text-black">
            No Deep Analysis calls yet. Switch to Deep Analysis mode in the app
            and run your first analysis to see usage here.
          </p>
        </div>
      )}

      <p className="text-xs text-black">
        PIA does not store your documents or prompts. Only aggregate token counts
        are recorded for billing.
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
      <p className="text-xs text-black mt-2 text-center">
        Daily token usage (last 30 days)
      </p>
    </div>
  );
}
