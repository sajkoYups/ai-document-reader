"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function RequestMoreAnalysesButton({
  className = "",
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function requestMore() {
    setStatus("sending");
    try {
      const response = await fetch("/api/usage/increase-request", {
        method: "POST",
      });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className={`text-sm text-text-secondary ${className}`}>
        Request sent. We&apos;ll be in touch.
      </p>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 ${align === "center" ? "items-center" : "items-stretch"} ${className}`}
    >
      <button
        type="button"
        onClick={() => void requestMore()}
        disabled={status === "sending"}
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-accent text-surface-0 hover:opacity-90 disabled:opacity-60 cursor-pointer"
      >
        {status === "sending" ? "Sending…" : "Request more analyses"}
      </button>
      {status === "error" ? (
        <p className="text-xs text-danger">Could not send the request. Try again.</p>
      ) : null}
    </div>
  );
}
