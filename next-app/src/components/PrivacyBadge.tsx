"use client";

import { useState } from "react";
import Link from "next/link";
import { useAiStore } from "@/store/aiStore";
import Modal from "./Modal";

export default function PrivacyBadge() {
  const [showModal, setShowModal] = useState(false);
  const processingMode = useAiStore((s) => s.processingMode);
  const isDeepAnalysis = processingMode === "api";

  const label = isDeepAnalysis ? "Private · Encrypted" : "Private · On-Device";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-accent-dim border border-accent-border
          text-accent text-xs font-medium tracking-wide
          hover:bg-accent/15 transition-colors cursor-pointer"
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-accent"
          style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
        />
        {label}
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-text-primary">
            How we handle your document
          </h2>
          {isDeepAnalysis ? (
            <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
              <p>
                In Deep Analysis mode your document is{" "}
                <strong className="text-text-primary">encrypted to our API</strong>
                . We decrypt it in memory, then send the text over TLS to named
                privacy-constrained AI providers. We{" "}
                <strong className="text-text-primary">do not save</strong> your
                document, prompts, or results in our database.
              </p>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Encrypted to PIA (application-layer session keys in your browser)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  PIA processes in memory only — no document or prompt storage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Inference providers see plaintext only for the request, under
                  their published policies
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Session keys expire and are overwritten after a short time
                </li>
              </ul>
              <p>
                Details on OpenRouter, Azure, Novita AI, DeepInfra, and optional
                RunPod are in our{" "}
                <Link
                  href="/trust-center#ai-subprocessors"
                  className="text-accent underline"
                  onClick={() => setShowModal(false)}
                >
                  Trust Center
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
              <p>
                Your document is processed directly on your device using local AI
                models. It is <strong className="text-text-primary">not</strong>{" "}
                sent to our servers and is{" "}
                <strong className="text-text-primary">not</strong> stored anywhere.
              </p>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  All processing occurs locally in your browser
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Documents are never uploaded to any server
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  No persistent storage of your files
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Closing the page clears all session data
                </li>
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
