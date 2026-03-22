"use client";

import { useState } from "react";
import Modal from "./Modal";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = () => {
    if (status === "submitting") return;
    // Reset on close so the form is fresh next time
    setFirstName("");
    setLastName("");
    setEmail("");
    setStatus("idle");
    setErrorMsg("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
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
            You&apos;re on the list!
          </h2>
          <p className="text-sm text-text-secondary">
            We&apos;ll reach out when access opens. Thanks for your interest in
            Doc Analyzer.
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
              Join the waitlist
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Deep Analysis gives you access to a stronger, server-side AI model
              for document analysis. Leave your details and we&apos;ll invite
              you when a spot opens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="wl-first"
                className="block text-xs font-medium text-text-secondary"
              >
                First name
              </label>
              <input
                id="wl-first"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={status === "submitting"}
                placeholder="Jane"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border
                  text-sm text-text-primary placeholder:text-text-muted
                  focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                  disabled:opacity-50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="wl-last"
                className="block text-xs font-medium text-text-secondary"
              >
                Last name
              </label>
              <input
                id="wl-last"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={status === "submitting"}
                placeholder="Doe"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border
                  text-sm text-text-primary placeholder:text-text-muted
                  focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                  disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="wl-email"
              className="block text-xs font-medium text-text-secondary"
            >
              Email address
            </label>
            <input
              id="wl-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border
                text-sm text-text-primary placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                disabled:opacity-50 transition-colors"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-danger px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white
              hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Submitting…" : "Request access"}
          </button>

          <p className="text-xs text-text-muted text-center">
            We only store your name and email to manage waitlist access. No
            spam, ever.
          </p>
        </form>
      )}
    </Modal>
  );
}
