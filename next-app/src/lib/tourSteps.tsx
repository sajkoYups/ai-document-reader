"use client";

import type { StepType } from "@reactour/tour";

export const ONBOARDING_STEPS: StepType[] = [
  {
    selector: "body",
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-xl text-text-primary">
          Welcome to PIA
        </h3>
        <p className="text-base text-text-secondary leading-relaxed">
          This short tour shows how to add a private document, pick a workflow, and read structured results with follow-ups.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-privacy"]',
    position: "bottom",
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
    position: "bottom",
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
    position: "bottom",
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
    position: "bottom",
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
    selector: '[data-tour-id="header-tour-button"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Replay this tour
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Use this button any time to re-open the product tour and quickly remind yourself how the app is structured.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="file-upload"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Add your document
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Start by uploading a PDF, TXT, or Markdown file, or drag and drop it here. We only use it in your current session.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="text-input"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Or paste text directly
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          You can also paste any text here instead of uploading a file. PIA will work from whatever is in this box.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="task-selector"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Choose a workflow
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Select an analysis, then click Run. Extract types sit under Extract — they are options for that workflow, not separate analyses. You can add up to three documents in a session.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="run-button"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Run the analysis
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          When you&apos;re ready, click Run. Structured results appear as they stream in — key points, findings, or table rows — without waiting for a full JSON dump.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="output-section"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-base text-text-primary">
          Read results and follow up
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Summaries, review findings, and extraction tables appear here with clickable evidence. Use Ask or the follow-up bar to dig into anything that needs attention.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-feedback"]',
    position: "bottom",
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
