import { useEffect, useRef, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { useChatStore } from "@/store/chatStore";
import { useSessionStore } from "@/store/sessionStore";
import { useAiStore } from "@/store/aiStore";
import { useEmbeddingStore } from "@/store/embeddingStore";
import { destroyApiSession } from "@/lib/apiClient";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;

export function useSessionCleanup() {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningCallback = useRef<(() => void) | null>(null);

  const fullCleanup = useCallback(() => {
    const aiWorker = useAiStore.getState().worker;
    const embeddingWorker = useEmbeddingStore.getState().worker;

    useDocumentStore.getState().clear();
    useChatStore.getState().clear();
    useSessionStore.getState().clear();
    useEmbeddingStore.getState().clear();

    if (aiWorker) aiWorker.terminate();
    if (embeddingWorker) embeddingWorker.terminate();

    destroyApiSession();
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    warningTimer.current = setTimeout(() => {
      warningCallback.current?.();
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    idleTimer.current = setTimeout(() => {
      fullCleanup();
    }, IDLE_TIMEOUT_MS);
  }, [fullCleanup]);

  useEffect(() => {
    const handleBeforeUnload = () => fullCleanup();
    window.addEventListener("beforeunload", handleBeforeUnload);

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => resetIdleTimer();

    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    resetIdleTimer();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity);
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [fullCleanup, resetIdleTimer]);

  return {
    setWarningCallback: (cb: () => void) => {
      warningCallback.current = cb;
    },
    forceCleanup: fullCleanup,
  };
}
