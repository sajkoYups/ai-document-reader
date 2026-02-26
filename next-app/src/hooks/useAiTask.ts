import { useState, useCallback } from "react";
import { useAiStore } from "@/store/aiStore";
import { analyzeViaApi } from "@/lib/apiClient";
import type { TaskType } from "@/types";

interface UseAiTaskReturn {
  output: string;
  isProcessing: boolean;
  error: string | null;
  run: (taskType: string, text: string) => void;
  stop: () => void;
  reset: () => void;
}

export function useAiTask(): UseAiTaskReturn {
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runTask = useAiStore((s) => s.runTask);
  const cancelTask = useAiStore((s) => s.cancelTask);
  const processingMode = useAiStore((s) => s.processingMode);

  const run = useCallback(
    (taskType: string, text: string) => {
      setOutput("");
      setError(null);
      setIsProcessing(true);

      if (processingMode === "api") {
        analyzeViaApi(
          taskType as TaskType,
          text,
          (token) => setOutput((prev) => prev + token),
        )
          .then(() => setIsProcessing(false))
          .catch((err) => {
            setError(err instanceof Error ? err.message : String(err));
            setIsProcessing(false);
          });
        return;
      }

      runTask(
        taskType,
        text,
        undefined,
        (token) => setOutput((prev) => prev + token),
        (result) => {
          setOutput(result);
          setIsProcessing(false);
        },
        (err) => {
          setError(err);
          setIsProcessing(false);
        },
      );
    },
    [runTask, processingMode],
  );

  const stop = useCallback(() => {
    cancelTask();
  }, [cancelTask]);

  const reset = useCallback(() => {
    setOutput("");
    setError(null);
    setIsProcessing(false);
  }, []);

  return { output, isProcessing, error, run, stop, reset };
}
