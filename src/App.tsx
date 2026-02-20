import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { TaskType } from "@/types";
import { useDocumentStore } from "@/store/documentStore";
import { useAiStore } from "@/store/aiStore";
import { useChatStore } from "@/store/chatStore";
import { useEmbeddingStore } from "@/store/embeddingStore";
import { useAiTask } from "@/hooks/useAiTask";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSessionCleanup } from "@/hooks/useSessionCleanup";
import { checkBrowserCompatibility } from "@/lib/compatibility";
import { validateFileSize, getSupportedFileType } from "@/lib/documentParser";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import {
  buildChatHistory,
  assembleContext,
  extractEvidence,
} from "@/lib/chatPipeline";
import { TASK_LABELS } from "@/lib/prompts";
import Layout from "./components/Layout";
import TextArea from "./components/TextArea";
import FileUpload from "./components/FileUpload";
import TaskSelector from "./components/TaskSelector";
import OutputPanel from "./components/OutputPanel";
import ChatPanel from "./components/ChatPanel";
import Button from "./components/Button";
import ProgressBar from "./components/ProgressBar";
import ToastContainer, { showToast } from "./components/Toast";

export default function App() {
  const doc = useDocumentStore();
  const ai = useAiStore();
  const chat = useChatStore();
  const embedding = useEmbeddingStore();
  const task = useAiTask();

  const [selectedTask, setSelectedTask] = useState<TaskType>("summarize");
  const lastIndexedText = useRef<string>("");

  const compat = useMemo(() => checkBrowserCompatibility(), []);

  useSessionCleanup();

  useEffect(() => {
    if (compat.allPassed) {
      ai.initWorker();
    }
  }, [compat.allPassed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const text = doc.rawText.trim();
    if (text.length > 0 && text !== lastIndexedText.current) {
      lastIndexedText.current = text;
      embedding.indexDocument(doc.rawText);
    } else if (text.length === 0 && lastIndexedText.current !== "") {
      lastIndexedText.current = "";
      embedding.clear();
    }
  }, [doc.rawText]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasDocument = doc.rawText.trim().length > 0;
  const isChat = selectedTask === "chat";

  const handleFile = useCallback(
    async (file: File) => {
      const sizeError = validateFileSize(file);
      if (sizeError) {
        doc.setError(sizeError);
        showToast(sizeError, "error");
        return;
      }

      const fileType = getSupportedFileType(file);
      if (!fileType) {
        const msg =
          "Unsupported file type. Please upload a PDF, TXT, or Markdown file.";
        doc.setError(msg);
        showToast(msg, "error");
        return;
      }

      try {
        let text: string;
        if (fileType === "pdf") {
          text = await extractTextFromPdf(file);
        } else {
          text = await file.text();
        }

        if (!text.trim()) {
          doc.setError("Could not extract text from this file.");
          return;
        }

        doc.setFromFile(text, file.name, fileType);
        showToast(`Loaded ${file.name}`, "success");
      } catch {
        doc.setError("Failed to read file. It may be corrupted or encrypted.");
        showToast("Failed to read file", "error");
      }
    },
    [doc],
  );

  const MAX_DIRECT_CHARS = 10000;

  const handleRun = useCallback(async () => {
    if (!hasDocument || ai.modelStatus !== "ready" || task.isProcessing) return;

    const isShortDoc = doc.rawText.length <= MAX_DIRECT_CHARS;

    if (isShortDoc || embedding.status !== "ready") {
      task.run(selectedTask, doc.rawText);
      return;
    }

    try {
      let context: string;

      if (selectedTask === "summarize" || selectedTask === "explain") {
        const spread = embedding.getSpreadChunks(MAX_DIRECT_CHARS);
        context = assembleContext(spread, MAX_DIRECT_CHARS);
      } else if (selectedTask === "extract") {
        const chunks = await embedding.retrieveChunks(
          "key points obligations risks dates terms price cost amount payment",
          8,
        );
        context = assembleContext(chunks, MAX_DIRECT_CHARS);
      } else {
        task.run(selectedTask, doc.rawText);
        return;
      }

      task.run(selectedTask, context);
    } catch {
      task.run(selectedTask, doc.rawText);
    }
  }, [hasDocument, ai.modelStatus, task, selectedTask, doc.rawText, embedding]);

  const handleChatSend = async (message: string) => {
    chat.addUserMessage(message);
    chat.startAssistantMessage();

    const allMessages = [
      ...chat.messages,
      { role: "user" as const, content: message },
    ];
    const history = buildChatHistory(allMessages);

    let contextDoc: string;
    if (embedding.status === "ready") {
      try {
        const chunks = await embedding.retrieveChunks(message, 6);
        contextDoc = assembleContext(chunks);
      } catch {
        contextDoc = doc.rawText;
      }
    } else {
      contextDoc = doc.rawText;
    }

    ai.runTask(
      "chat",
      contextDoc,
      history,
      (token) => chat.appendToLastAssistant(token),
      (result) => {
        const evidence = extractEvidence(result, doc.sections);
        chat.finalizeAssistantMessage(
          evidence.length > 0 ? evidence : undefined,
        );
      },
      (error) => chat.setAssistantError(error),
    );
  };

  const handleClear = useCallback(() => {
    doc.clear();
    task.reset();
    chat.clear();
    embedding.clear();
    lastIndexedText.current = "";
    showToast("Session cleared", "info");
  }, [doc, task, chat, embedding]);

  const handleTaskSwitch = (newTask: TaskType) => {
    setSelectedTask(newTask);
    task.reset();
  };

  useKeyboardShortcuts({
    onRun: handleRun,
    onClear: handleClear,
  });

  if (!compat.allPassed) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/10 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-warning"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-text-primary">
            Browser Not Supported
          </h2>
          <div className="space-y-2 text-sm text-text-secondary">
            {compat.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            Please use a modern browser like Chrome, Edge, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout modelStatus={ai.modelStatus} inferenceDevice={ai.inferenceDevice}>
      <ToastContainer />

      {(ai.modelStatus === "downloading" || ai.modelStatus === "loading") && (
        <div className="mb-6 animate-fade-in">
          <ProgressBar
            progress={ai.downloadProgress}
            label={
              ai.currentFile
                ? `Downloading: ${ai.currentFile.split("/").pop()}`
                : "Loading AI model"
            }
          />
        </div>
      )}

      {(embedding.status === "loading-model" || embedding.status === "indexing") && (
        <div className="mb-6 animate-fade-in">
          <ProgressBar
            progress={embedding.status === "indexing" ? 90 : embedding.downloadProgress}
            label={
              embedding.status === "indexing"
                ? "Indexing document for search..."
                : "Downloading search model..."
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Input */}
        <div className="space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-text-primary tracking-tight">
              Your Document
            </h2>
            <p className="text-sm text-text-muted">
              Paste text or upload a file to get started.
            </p>
          </div>

          <FileUpload onFile={handleFile} />

          {doc.error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger animate-fade-in">
              {doc.error}
            </div>
          )}

          {doc.fileName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs text-text-secondary animate-fade-in">
              <span className="font-mono">{doc.fileName}</span>
              <span className="text-text-muted">
                ({doc.sections.length}{" "}
                {doc.sections.length === 1 ? "section" : "sections"})
              </span>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2">
              <span className="bg-surface-0 px-3 text-xs text-text-muted">
                or paste your text
              </span>
            </div>
          </div>

          <TextArea
            value={doc.rawText}
            onChange={(e) => doc.setText(e.target.value)}
            placeholder="Paste your document content here..."
            rows={10}
          />

          {hasDocument && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-mono">
                {doc.rawText.length.toLocaleString()} chars &middot;{" "}
                {doc.sections.length}{" "}
                {doc.sections.length === 1 ? "section" : "sections"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-medium text-text-secondary tracking-wide uppercase">
              Task
            </label>
            <TaskSelector
              selected={selectedTask}
              onSelect={handleTaskSwitch}
              disabled={!hasDocument}
            />
          </div>

          {!isChat && (
            <div className="space-y-2">
              {ai.modelStatus === "idle" && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => ai.loadModel()}
                  className="w-full"
                >
                  Load AI Model
                </Button>
              )}
              {ai.modelStatus === "error" && (
                <div className="space-y-2">
                  <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                    {ai.error ?? "Failed to load model"}
                  </div>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => ai.loadModel()}
                    className="w-full"
                  >
                    Retry
                  </Button>
                </div>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleRun}
                disabled={
                  !hasDocument ||
                  task.isProcessing ||
                  ai.modelStatus !== "ready"
                }
                className="w-full"
              >
                {task.isProcessing
                  ? "Processing..."
                  : `Run ${TASK_LABELS[selectedTask] ?? selectedTask}`}
              </Button>

              {ai.modelStatus === "ready" && (
                <p className="text-xs text-text-muted text-center">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-mono">
                    Ctrl+Enter
                  </kbd>{" "}
                  to run &middot;{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-mono">
                    Esc
                  </kbd>{" "}
                  to clear
                </p>
              )}
            </div>
          )}

          {isChat && ai.modelStatus === "idle" && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => ai.loadModel()}
              className="w-full"
            >
              Load AI Model to Chat
            </Button>
          )}
        </div>

        {/* Right panel: Output or Chat */}
        <div
          className="animate-fade-in min-h-[400px] lg:min-h-0"
          style={{ animationDelay: "0.1s" }}
        >
          {isChat ? (
            <ChatPanel
              messages={chat.messages}
              isGenerating={chat.isGenerating}
              onSend={handleChatSend}
              onClear={() => chat.clear()}
              disabled={!hasDocument || ai.modelStatus !== "ready"}
            />
          ) : (
            <OutputPanel
              content={task.output}
              isLoading={task.isProcessing}
              taskLabel={TASK_LABELS[selectedTask] ?? selectedTask}
              error={task.error}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
