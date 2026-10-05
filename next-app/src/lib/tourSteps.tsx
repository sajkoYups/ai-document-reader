"use client";

import type { StepType } from "@reactour/tour";
import WaitlistCta from "@/components/WaitlistCta";

export const ONBOARDING_STEPS: StepType[] = [
  {
    selector: '[data-tour-id="output-section"]',
    position: "center",
    content: (
      <div className="space-y-3">
        <h3 className="font-display text-xl text-text-primary">
          You&apos;re on the on-device model
        </h3>
        <p className="text-base text-text-secondary leading-relaxed">
          Analysis runs locally in this browser. Your document stays on this
          device. The hosted model is far more capable on long documents and
          fine detail. Join the waitlist for a free testing period through 31
          October 2026.
        </p>
        <WaitlistCta className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity">
          Join the waitlist
        </WaitlistCta>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="output-section"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-xl text-text-primary">
          Welcome to PIA
        </h3>
        <p className="text-base text-text-secondary leading-relaxed">
          This workspace has three panes: Workflows on the left, analysis in the center, and Sources on the right. This short tour walks through each.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-privacy"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Privacy & where your data lives
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          This indicator shows whether your document stays on-device (Standard) or is encrypted to our API for Deep Analysis, then processed by named privacy-constrained providers. Click it any time for details.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-mode-toggle"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Standard vs Deep Analysis
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Use these modes to choose between fast on-device analysis (Standard) and stronger Deep Analysis. Deep Analysis encrypts the request to our API; privacy-constrained providers then process the text. Review, Extract, Compare, and most advanced workflows need Deep Analysis; Summarize, Ask, and Document map work on-device.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-language"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Output language
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Choose the language you want the AI to answer in. This affects summaries, reviews, extractions, and Ask answers — not your original document.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-account"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Account & sign-in
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Sign in or create an account here to unlock Deep Analysis and manage your access. When you&apos;re signed in, your profile menu appears in this spot.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="sources-panel"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Sources
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Add documents here — upload a PDF, TXT, or Markdown file, or paste text. You can keep up to three in a session. Analysis always uses the sources in this pane.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="task-selector"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Workflows
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Pick an analysis in the left sidebar. Extract types sit under Extract. More workflows opens the full catalog.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="run-button"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Run the analysis
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          When a source is ready, click Run here. Structured results stream into the center pane. Ask uses the composer in the center instead of Run.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="output-section"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Read results and follow up
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Summaries, findings, and tables appear in this center canvas with clickable evidence. Use Ask or the follow-up bar to dig into anything that needs attention.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-feedback"]',
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Leave us feedback
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Found something you&apos;d like us to improve or replace? Click here to send us a quick note — every message goes straight to the team and helps shape what we build next.
        </p>
      </div>
    ),
  },
];

export function mobilePaneForTourStep(
  stepIndex: number,
): "workflows" | "sources" | null {
  const selector = ONBOARDING_STEPS[stepIndex]?.selector;
  if (typeof selector !== "string") return null;
  if (selector.includes("sources-panel")) return "sources";
  if (selector.includes("task-selector") || selector.includes("run-button")) {
    return "workflows";
  }
  return null;
}
