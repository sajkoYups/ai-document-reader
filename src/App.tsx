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
import { CHAT_TOP_K, EXTRACT_TOP_K } from "@/lib/retrieval";
import { checkApiHealth, chatViaApi } from "@/lib/apiClient";
import { TASK_LABELS } from "@/lib/prompts";
import Layout from "./components/Layout";
import TextArea from "./components/TextArea";
import FileUpload from "./components/FileUpload";
import TaskSelector from "./components/TaskSelector";
import ModeToggle from "./components/ModeToggle";
import OutputPanel from "./components/OutputPanel";
import ChatPanel from "./components/ChatPanel";
import Button from "./components/Button";
import ProgressBar from "./components/ProgressBar";
import ToastContainer, { showToast } from "./components/Toast";
import DebugPanel, { type RagDebugInfo } from "./components/DebugPanel";

export default function App() {
  const doc = useDocumentStore();
  const ai = useAiStore();
  const chat = useChatStore();
  const embedding = useEmbeddingStore();
  const task = useAiTask();

  const [selectedTask, setSelectedTask] = useState<TaskType>("summarize");
  const [debugInfo, setDebugInfo] = useState<RagDebugInfo | null>(null);
  const lastIndexedText = useRef<string>("");

  const compat = useMemo(() => checkBrowserCompatibility(), []);

  const { setWarningCallback, forceCleanup } = useSessionCleanup();

  useEffect(() => {
    setWarningCallback(() => {
      showToast("Session will be cleared in 60 seconds due to inactivity. Move your mouse to stay active.", "info");
    });
  }, [setWarningCallback]);

  useEffect(() => {
    if (compat.allPassed) {
      ai.initAndLoad();
    }
  }, [compat.allPassed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkApiHealth().then((ok) => ai.setApiAvailable(ok));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isSecure =
      location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isSecure) {
      showToast("Not on HTTPS — encryption and privacy guarantees require a secure connection.", "error");
    }
  }, []);

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

  const isModelReady = ai.processingMode === "api" || ai.modelStatus === "ready";

  const handleRun = useCallback(async () => {
    if (!hasDocument || !isModelReady || task.isProcessing) return;

    const totalDocChars = doc.rawText.length;
    const totalDocChunks = embedding.chunks.length;
    const isShortDoc = totalDocChars <= MAX_DIRECT_CHARS;

    if (isShortDoc) {
      setDebugInfo({
        method: "direct",
        retrievedChunks: [],
        contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });
      task.run(selectedTask, doc.rawText);
      return;
    }

    if ((selectedTask === "summarize" || selectedTask === "explain") && embedding.status !== "ready") {
      setDebugInfo({
        method: "direct",
        retrievedChunks: [],
        contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });
      task.run(selectedTask, doc.rawText);
      return;
    }

    try {
      let contextText: string;
      let retrievedChunks: import("@/lib/documentChunker").DocumentChunk[];
      let method: RagDebugInfo["method"];
      let query: string | undefined;

      if (selectedTask === "summarize" || selectedTask === "explain") {
        retrievedChunks = embedding.getSpreadChunks(MAX_DIRECT_CHARS, doc.sections);
        const { text, meta } = assembleContext(retrievedChunks, MAX_DIRECT_CHARS);
        contextText = text;
        method = "spread";
        setDebugInfo({ method, retrievedChunks, contextMeta: meta, totalDocChars, totalDocChunks, timestamp: Date.now() });
      } else if (selectedTask === "extract") {
        query = "key points obligations risks dates terms price cost amount payment";
        if (embedding.chunks.length > 0) {
          retrievedChunks = await embedding.retrieveChunksHybrid(query, EXTRACT_TOP_K, { useMMR: false });
          const { text, meta } = assembleContext(retrievedChunks, MAX_DIRECT_CHARS);
          contextText = text;
          method = embedding.status === "ready" ? "hybrid" : "keyword-fallback";
          setDebugInfo({ method, query, retrievedChunks, contextMeta: meta, totalDocChars, totalDocChunks, timestamp: Date.now() });
        } else {
          setDebugInfo({
            method: "direct",
            retrievedChunks: [],
            contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
            totalDocChars,
            totalDocChunks,
            timestamp: Date.now(),
          });
          task.run(selectedTask, doc.rawText);
          return;
        }
      } else {
        setDebugInfo({
          method: "direct",
          retrievedChunks: [],
          contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
          totalDocChars,
          totalDocChunks,
          timestamp: Date.now(),
        });
        task.run(selectedTask, doc.rawText);
        return;
      }

      task.run(selectedTask, contextText);
    } catch {
      setDebugInfo({
        method: "fallback",
        retrievedChunks: [],
        contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });
      task.run(selectedTask, doc.rawText);
    }
  }, [hasDocument, isModelReady, task, selectedTask, doc.rawText, doc.sections, embedding]);

  const handleChatSend = async (message: string) => {
    chat.addUserMessage(message);
    chat.startAssistantMessage();

    const totalDocChars = doc.rawText.length;
    const totalDocChunks = embedding.chunks.length;

    if (ai.processingMode === "api") {
      const allMessages = [
        ...chat.messages,
        { role: "user" as const, content: message },
      ];
      const history = buildChatHistory(allMessages);

      setDebugInfo({
        method: "direct",
        query: message,
        retrievedChunks: [],
        contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });

      chatViaApi(
        doc.rawText,
        message,
        history,
        (token) => chat.appendToLastAssistant(token),
      )
        .then((result) => {
          const evidence = extractEvidence(result, doc.sections);
          chat.finalizeAssistantMessage(
            evidence.length > 0 ? evidence : undefined,
          );
        })
        .catch((err) =>
          chat.setAssistantError(
            err instanceof Error ? err.message : String(err),
          ),
        );
      return;
    }

    const allMessages = [
      ...chat.messages,
      { role: "user" as const, content: message },
    ];
    const history = buildChatHistory(allMessages);

    let contextDoc: string;
    if (embedding.chunks.length > 0) {
      try {
        const retrievedChunks = await embedding.retrieveChunksHybrid(message, CHAT_TOP_K);
        const { text, meta } = assembleContext(retrievedChunks);
        contextDoc = text;
        const method = embedding.status === "ready" ? "hybrid" : "keyword-fallback";
        setDebugInfo({ method, query: message, retrievedChunks, contextMeta: meta, totalDocChars, totalDocChunks, timestamp: Date.now() });
      } catch {
        contextDoc = doc.rawText;
        setDebugInfo({
          method: "fallback",
          query: message,
          retrievedChunks: [],
          contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
          totalDocChars,
          totalDocChunks,
          timestamp: Date.now(),
        });
      }
    } else {
      contextDoc = doc.rawText;
      setDebugInfo({
        method: "direct",
        query: message,
        retrievedChunks: [],
        contextMeta: { chunksIncluded: 0, totalChars: totalDocChars, truncatedChunks: 0, gapMarkers: 0 },
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });
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
    forceCleanup();
    showToast("Session cleared", "info");
  }, [doc, task, chat, embedding, forceCleanup]);

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
                ? `Building model: ${ai.currentFile.split("/").pop()}`
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
                : "Building search model..."
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
              Paste text or add a file to get started.
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
              Processing Mode
            </label>
            <ModeToggle />
          </div>

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
                  !isModelReady
                }
                className="w-full"
              >
                {task.isProcessing
                  ? "Processing..."
                  : !isModelReady
                    ? "Model loading..."
                    : `Run ${TASK_LABELS[selectedTask] ?? selectedTask}`}
              </Button>

              {isModelReady && (
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

          {isChat && ai.modelStatus === "error" && (
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
        </div>

        {/* Right panel: Output or Chat */}
        <div
          className="animate-fade-in min-h-[400px] lg:min-h-0 space-y-3"
          style={{ animationDelay: "0.1s" }}
        >
          {selectedTask === "summarize" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Summarize produces a short overview and a numbered list of key points from your document. You’ll get a quick grasp of the main topic and the most important findings or actions. The AI can sometimes make mistakes—if the result isn’t right, run it again to regenerate a response.
            </p>
          )}
          {selectedTask === "explain" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Explain gives you a plain-language summary that highlights the main ideas and briefly explains any technical or specialized terms so a general reader can follow. The AI can sometimes make mistakes—if the result isn’t right, run it again to regenerate a response.
            </p>
          )}
          {selectedTask === "chat" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Chat lets you ask questions about your document and get answers grounded in its content. Use it to find specific information, clarify sections, or explore topics in the text. The AI can sometimes make mistakes—if an answer isn’t right, you can ask again or rephrase to get a better response.
            </p>
          )}
          {isChat ? (
            <ChatPanel
              messages={chat.messages}
              isGenerating={chat.isGenerating}
              onSend={handleChatSend}
              onClear={() => chat.clear()}
              disabled={!hasDocument || !isModelReady}
            />
          ) : (
            <OutputPanel
              content={task.output}
              isLoading={task.isProcessing}
              taskLabel={TASK_LABELS[selectedTask] ?? selectedTask}
              error={task.error}
            />
          )}
          <DebugPanel debugInfo={debugInfo} />
        </div>
      </div>
    </Layout>
  );
}
