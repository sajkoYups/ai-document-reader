"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";

interface OnboardingContextValue {
  startTour: () => void;
  hasCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const STORAGE_KEY = "doc-analyzer-onboarding-v1-completed";

interface AppOnboardingProviderProps {
  children: ReactNode;
}

const STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
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
    target: '[data-tour-id="header-privacy"]',
    placement: "bottom",
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
    target: '[data-tour-id="header-mode-toggle"]',
    placement: "bottom",
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
    target: '[data-tour-id="header-language"]',
    placement: "bottom",
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
    target: '[data-tour-id="header-account"]',
    placement: "bottom",
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
    target: '[data-tour-id="header-tour-button"]',
    placement: "bottom",
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
    target: '[data-tour-id="file-upload"]',
    placement: "bottom",
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
    target: '[data-tour-id="text-input"]',
    placement: "top",
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
    target: '[data-tour-id="task-selector"]',
    placement: "top",
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
    target: '[data-tour-id="run-button"]',
    placement: "top",
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
    target: '[data-tour-id="output-section"]',
    placement: "top",
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

export function AppOnboardingProvider({ children }: AppOnboardingProviderProps) {
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [run, setRun] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const completed = window.localStorage.getItem(STORAGE_KEY) === "true";
    return !completed;
  });

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setHasCompleted(true);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "true");
      }
    }
  }, []);

  const startTour = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "false");
    }
    setHasCompleted(false);
    setRun(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      startTour,
      hasCompleted,
    }),
    [startTour, hasCompleted],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      <Joyride
        steps={STEPS}
        run={run}
        continuous
        scrollToFirstStep
        showProgress
        showSkipButton
        callback={handleCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "var(--color-accent)",
            textColor: "var(--color-text-primary)",
            backgroundColor: "var(--color-surface-1)",
            overlayColor: "rgba(10,10,11,0.70)",
          },
          tooltip: {
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow:
              "0 18px 45px rgba(0,0,0,0.75), 0 0 0 1px var(--color-border)",
            backgroundColor: "var(--color-surface-1)",
            color: "var(--color-text-primary)",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          buttonNext: {
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
          },
          buttonBack: {
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
          },
          buttonSkip: {
            fontSize: 11,
          },
          spotlight: {
            borderRadius: 16,
            boxShadow: "0 0 0 1px var(--color-accent-border)",
          },
        }}
        spotlightPadding={8}
        disableScrolling={false}
      />
    </OnboardingContext.Provider>
  );
}

export function useAppOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useAppOnboarding must be used within AppOnboardingProvider");
  }
  return ctx;
}

