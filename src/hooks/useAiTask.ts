import { useState, useCallback } from "react";
import { useAiStore } from "@/store/aiStore";

interface UseAiTaskReturn {
  output: string;
  isProcessing: boolean;
  error: string | null;
  run: (taskType: string, text: string) => void;
  reset: () => void;
}

export function useAiTask(): UseAiTaskReturn {
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runTask = useAiStore((s) => s.runTask);

  const run = useCallback(
    (taskType: string, text: string) => {
      setOutput("");
      setError(null);
      setIsProcessing(true);

      runTask(
        taskType,
        text,
        undefined,
        (token) => setOutput((prev) => prev + token),
        () => setIsProcessing(false),
        (err) => {
          setError(err);
          setIsProcessing(false);
        },
      );
    },
    [runTask],
  );

  const reset = useCallback(() => {
    setOutput("");
    setError(null);
    setIsProcessing(false);
  }, []);

  return { output, isProcessing, error, run, reset };
}
