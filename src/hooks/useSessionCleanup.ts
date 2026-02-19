import { useEffect } from "react";
import { useDocumentStore } from "@/store/documentStore";
import { useChatStore } from "@/store/chatStore";

export function useSessionCleanup() {
  useEffect(() => {
    const cleanup = () => {
      useDocumentStore.getState().clear();
      useChatStore.getState().clear();
    };

    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);
}
