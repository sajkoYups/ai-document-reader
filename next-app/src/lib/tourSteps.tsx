"use client";

import type { StepType } from "@reactour/tour";

export const ONBOARDING_STEPS: StepType[] = [
  {
    selector: "body",
    position: "center",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-lg text-text-primary">
          Welcome to Doc Analyzer
        </h3>
        <p className="text-sm text-text-secondary">
          This short tour will show you how to add a document, pick what you want the AI to do, and read the results.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-privacy"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Privacy & where your data lives
        </h3>
        <p className="text-xs text-text-secondary">
          This indicator shows whether your document is kept on-device (Standard) or sent as encrypted data for Deep Analysis. Click it any time to see a detailed explanation of how we handle your privacy.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-mode-toggle"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Standard vs Deep Analysis
        </h3>
        <p className="text-xs text-text-secondary">
          Use these modes to choose between fast on-device analysis (Standard) and stronger, encrypted server-side analysis (Deep Analysis). We&apos;ll disable options automatically if they aren&apos;t available on your device.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-language"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Output language
        </h3>
        <p className="text-xs text-text-secondary">
          Choose the language you want the AI to answer in. This affects summaries, explanations, and Deep Analysis responses, not your original document.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="header-account"]',
    position: "bottom",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Account & sign-in
        </h3>
        <p className="text-xs text-text-secondary">
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
        <h3 className="font-display text-sm text-text-primary">
          Replay this tour
        </h3>
        <p className="text-xs text-text-secondary">
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
        <h3 className="font-display text-sm text-text-primary">
          Add your document
        </h3>
        <p className="text-xs text-text-secondary">
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
        <h3 className="font-display text-sm text-text-primary">
          Or paste text directly
        </h3>
        <p className="text-xs text-text-secondary">
          You can also paste any text here instead of uploading a file. Doc Analyzer will work from whatever is in this box.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="task-selector"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Choose what you want the AI to do
        </h3>
        <p className="text-xs text-text-secondary">
          Pick a task such as Summarize, Explain, or Chat. You can change this at any time without reloading your document.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="run-button"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Run the analysis
        </h3>
        <p className="text-xs text-text-secondary">
          When you&apos;re ready, click Run. For longer documents you may see a quick preparation step before results appear.
        </p>
      </div>
    ),
  },
  {
    selector: '[data-tour-id="output-section"]',
    position: "top",
    content: (
      <div className="space-y-2">
        <h3 className="font-display text-sm text-text-primary">
          Read results and chat
        </h3>
        <p className="text-xs text-text-secondary">
          Your summaries, explanations, or chat answers appear here. Switch to Chat to ask follow-up questions grounded in your document.
        </p>
      </div>
    ),
  },
];
