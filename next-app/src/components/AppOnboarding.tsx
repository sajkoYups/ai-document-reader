"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTour } from "@reactour/tour";

const STORAGE_KEY = "doc-analyzer-onboarding-v2-completed";

interface OnboardingContextValue {
  startTour: () => void;
  hasCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface AppOnboardingProviderProps {
  children: ReactNode;
}

export function AppOnboardingProvider({ children }: AppOnboardingProviderProps) {
  const { setIsOpen, isOpen, setCurrentStep } = useTour();
  const prevOpenRef = useRef(false);
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const startTour = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "false");
    }
    setHasCompleted(false);
    setCurrentStep(0);
    setIsOpen(true);
  }, [setIsOpen, setCurrentStep]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = window.localStorage.getItem(STORAGE_KEY) === "true";
    if (completed) {
      setHasCompleted(true);
      return;
    }
    setIsOpen(true);
  }, [setIsOpen]);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (wasOpen && !isOpen && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setHasCompleted(true);
    }
  }, [isOpen]);

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
