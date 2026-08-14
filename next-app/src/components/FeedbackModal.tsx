"use client";

import { useState } from "react";
import Modal from "./Modal";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

type Sentiment = "good" | "bad" | null;
type FeedbackAction = "improve" | "replace" | null;
type FormStatus = "idle" | "submitting" | "success" | "error";

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [sentiment, setSentiment] = useState<Sentiment>(null);
  const [action, setAction] = useState<FeedbackAction>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = () => {
    if (status === "submitting") return;
    setSentiment(null);
    setAction(null);
    setMessage("");
    setStatus("idle");
    setErrorMsg("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentiment || !action) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment, action, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      {status === "success" ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-text-primary">
            Thanks for your feedback!
          </h2>
          <p className="text-sm text-text-secondary">
            We read every submission and use it to make PIA better.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-text-primary">
              Leave feedback
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Tell us what&apos;s working and what we should change. Every
              message goes straight to the team.
            </p>
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">
              How is your experience?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSentiment("good")}
                disabled={status === "submitting"}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60
                  ${
                    sentiment === "good"
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-surface-2 border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={sentiment === "good" ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                Good
              </button>
              <button
                type="button"
                onClick={() => setSentiment("bad")}
                disabled={status === "submitting"}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60
                  ${
                    sentiment === "bad"
                      ? "bg-danger/10 border-danger text-danger"
                      : "bg-surface-2 border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={sentiment === "bad" ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                  <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
                Bad
              </button>
            </div>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">
              What should we do?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction("improve")}
                disabled={status === "submitting"}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60
                  ${
                    action === "improve"
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-surface-2 border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                Improve it
              </button>
              <button
                type="button"
                onClick={() => setAction("replace")}
                disabled={status === "submitting"}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60
                  ${
                    action === "replace"
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-surface-2 border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                </svg>
                Replace it
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label
              htmlFor="fb-message"
              className="block text-xs font-medium text-text-secondary"
            >
              Details{" "}
              <span className="text-text-muted font-normal">(required)</span>
            </label>
            <textarea
              id="fb-message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "submitting"}
              placeholder="Tell us what you have in mind…"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border
                text-sm text-text-primary placeholder:text-text-muted resize-none
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                disabled:opacity-60 transition-colors"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-danger px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || !sentiment || !action || !message.trim()}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white
              hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Sending…" : "Send feedback"}
          </button>

          <p className="text-xs text-text-muted text-center">
            Your feedback is anonymous and goes directly to the team.
          </p>
        </form>
      )}
    </Modal>
  );
}
