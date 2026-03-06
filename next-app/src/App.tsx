"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  useAuth,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { OUTPUT_LANGUAGE_LABELS, type OutputLanguage, type TaskType } from "@/types";
import { useDocumentStore } from "@/store/documentStore";
import { useAiStore } from "@/store/aiStore";
import { useChatStore } from "@/store/chatStore";
import { useEmbeddingStore } from "@/store/embeddingStore";
import { useAiTask } from "@/hooks/useAiTask";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSessionCleanup } from "@/hooks/useSessionCleanup";
import { checkBrowserCompatibility } from "@/lib/compatibility";
import { isLikelyMobileDevice } from "@/lib/deviceUtils";
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
import PrivacyBadge from "./components/PrivacyBadge";
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
import { TourProvider } from "@reactour/tour";
import { ONBOARDING_STEPS } from "@/lib/tourSteps";
import { AppOnboardingProvider, useAppOnboarding } from "./components/AppOnboarding";

function AppContent() {
  const { isSignedIn } = useAuth();
  const doc = useDocumentStore();
  const ai = useAiStore();
  const setApiAvailable = useAiStore((s) => s.setApiAvailable);
  const setIsMobileDevice = useAiStore((s) => s.setIsMobileDevice);
  const setProcessingMode = useAiStore((s) => s.setProcessingMode);
  const processingMode = useAiStore((s) => s.processingMode);
  const chat = useChatStore();
  const embedding = useEmbeddingStore();
  const task = useAiTask();

  const [selectedTask, setSelectedTask] = useState<TaskType>("summarize");
  const [debugInfo, setDebugInfo] = useState<RagDebugInfo | null>(null);
  const lastIndexedText = useRef<string>("");
  const modeInitializedRef = useRef(false);

  const compat = useMemo(() => checkBrowserCompatibility(), []);

  const { setWarningCallback, forceCleanup } = useSessionCleanup();

  useEffect(() => {
    setWarningCallback(() => {
      showToast("Session will be cleared in 60 seconds due to inactivity. Move your mouse to stay active.", "info");
    });
  }, [setWarningCallback]);

  useEffect(() => {
    const isMobile = isLikelyMobileDevice();
    if (!isMobile) return;

    setIsMobileDevice(true);
    if (processingMode !== "api") {
      setProcessingMode("api");
    }
  }, [setIsMobileDevice, setProcessingMode, processingMode]);

  useEffect(() => {
    if (compat.allPassed && !isLikelyMobileDevice()) {
      ai.initAndLoad();
    }
  }, [compat.allPassed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let isActive = true;
    checkApiHealth().then((ok) => {
      if (isActive) setApiAvailable(ok);
    });
    return () => {
      isActive = false;
    };
  }, [isSignedIn, setApiAvailable]);

  useEffect(() => {
    if (modeInitializedRef.current) return;
    if (typeof isSignedIn !== "boolean") return;

    if (!isSignedIn) {
      modeInitializedRef.current = true;
      return;
    }

    if (ai.apiAvailable === false) {
      modeInitializedRef.current = true;
      return;
    }

    if (ai.processingMode === "local") {
      ai.setProcessingMode("api");
    }

    modeInitializedRef.current = true;
  }, [ai, isSignedIn]);

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
  const canUseDeepAnalysis = ai.processingMode !== "api" || isSignedIn === true;
  const isIndexing =
    hasDocument &&
    doc.rawText.length > MAX_DIRECT_CHARS &&
    (embedding.status === "loading-model" || embedding.status === "indexing");

  const handleRun = useCallback(async () => {
    if (!hasDocument || !isModelReady || task.isProcessing) return;
    if (isIndexing) {
      showToast(
        "Please wait — your document is still being prepared. You can run analysis when the progress bar above finishes.",
        "info",
      );
      return;
    }
    if (ai.processingMode === "api" && !isSignedIn) {
      showToast("Sign in to use Deep Analysis", "error");
      return;
    }

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
  }, [hasDocument, isModelReady, isIndexing, task, selectedTask, doc.rawText, doc.sections, embedding, ai.processingMode, isSignedIn]);

  const handleChatSend = async (message: string) => {
    if (isIndexing) {
      showToast(
        "Please wait — your document is still being prepared. You can ask questions when the progress bar above finishes.",
        "info",
      );
      return;
    }
    if (ai.processingMode === "api" && !isSignedIn) {
      showToast("Sign in to use Deep Analysis", "error");
      return;
    }
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
        ai.outputLanguage,
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
            Please use a modern browser like Chrome, Edge, or Firefox over HTTPS so secure Web Crypto–based encryption is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      modelStatus={ai.modelStatus}
      inferenceDevice={ai.inferenceDevice}
      headerRight={<AppHeaderRight />}
    >
      <ToastContainer />

      {ai.isMobileDevice && (
        <div
          role="status"
          className="mb-4 px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-secondary animate-fade-in"
          aria-live="polite"
        >
          On mobile, use Deep Analysis (API). Standard/local model is desktop-only.
        </div>
      )}

      {(ai.modelStatus === "downloading" || ai.modelStatus === "loading") && !ai.isMobileDevice && (
        <div className="mb-6 animate-fade-in shrink-0">
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
        <div className="mb-6 animate-fade-in shrink-0">
          <ProgressBar
            progress={embedding.status === "indexing" ? 90 : embedding.downloadProgress}
            label={
              embedding.status === "indexing"
                ? "Preparing document — run analysis when ready"
                : "Building search model..."
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left panel: Input - no column scroll; page scrolls as a whole */}
        <div className="space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-text-primary tracking-tight">
              Your Document
            </h2>
            <p className="text-sm text-text-muted">
              Paste text or add a file to get started.
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              1. Add your document (paste or upload). 2. Wait for it to be prepared (progress bar above, if it appears). 3. Choose a task and click Run.
            </p>
          </div>

          <FileUpload onFile={handleFile} data-tour-id="file-upload" />

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
            data-tour-id="text-input"
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

          {ai.processingMode === "api" && !isSignedIn && (
            <p className="text-xs text-text-muted">
              Sign in (top right) to use Deep Analysis.
            </p>
          )}

          <div className="space-y-3" data-tour-id="task-selector">
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
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {task.isProcessing ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={task.stop}
                    className="flex-1 sm:flex-initial"
                  >
                    Stop
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleRun}
                      disabled={
                        !hasDocument ||
                        !isModelReady ||
                        !canUseDeepAnalysis ||
                        isIndexing
                      }
                      className="flex-1"
                      title={
                        isIndexing
                          ? "Please wait — your document is still being prepared. You can run analysis when the progress bar above finishes."
                          : undefined
                      }
                      data-tour-id="run-button"
                    >
                      {!isModelReady
                        ? "Model loading..."
                        : isIndexing
                          ? "Preparing document…"
                          : `Run ${TASK_LABELS[selectedTask] ?? selectedTask}`}
                    </Button>
                    {task.output && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleRun}
                      disabled={
                        !hasDocument ||
                        !isModelReady ||
                        !canUseDeepAnalysis ||
                        isIndexing
                      }
                    >
                      Regenerate
                    </Button>
                    )}
                  </>
                )}
              </div>

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

        {/* Right panel: Output or Chat - grows with content; page scrolls as a whole */}
        <div
          className="animate-fade-in min-h-[400px] lg:min-h-0 min-w-0 flex flex-col space-y-3"
          style={{ animationDelay: "0.1s" }}
          data-tour-id="output-section"
        >
          {selectedTask === "summarize" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Summarize produces a short overview and a numbered list of key points from your document. You’ll get a quick grasp of the main topic and the most important findings or actions. The AI can sometimes make mistakes—if the result isn’t right, run it again to regenerate a response. If you run another task (e.g. Explain) in the same session, the second result can occasionally be less accurate; run again or refresh for a fresh start.
            </p>
          )}
          {selectedTask === "explain" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Explain gives you a plain-language summary that highlights the main ideas and briefly explains any technical or specialized terms so a general reader can follow. The AI can sometimes make mistakes—if the result isn’t right, run it again to regenerate a response. If you run another task (e.g. Summarize) in the same session, the second result can occasionally be less accurate; run again or refresh for a fresh start.
            </p>
          )}
          {selectedTask === "chat" && (
            <p className="text-sm text-text-secondary leading-relaxed">
              Chat lets you ask questions about your document and get answers grounded in its content. Use it to find specific information, clarify sections, or explore topics in the text. The AI can sometimes make mistakes—if an answer isn’t right, you can ask again or rephrase to get a better response.
            </p>
          )}
          {isChat ? (
            <div className="flex flex-col">
              <ChatPanel
                messages={chat.messages}
                isGenerating={chat.isGenerating}
                onSend={handleChatSend}
                onClear={() => chat.clear()}
                disabled={
                  !hasDocument ||
                  !isModelReady ||
                  !canUseDeepAnalysis ||
                  isIndexing
                }
                disabledReason={
                  isIndexing
                    ? "You can ask questions once the document has finished preparing (see progress bar above)."
                    : undefined
                }
              />
            </div>
          ) : (
            <OutputPanel
              content={task.output}
              isLoading={task.isProcessing}
              taskLabel={TASK_LABELS[selectedTask] ?? selectedTask}
              error={task.error}
              onStop={task.isProcessing ? task.stop : undefined}
            />
          )}
          <DebugPanel debugInfo={debugInfo} />
        </div>
      </div>

      {ai.processingMode === "api" && !isSignedIn && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 z-40 max-w-sm animate-fade-in
            rounded-lg border border-accent-border bg-accent-dim/95 backdrop-blur-sm
            px-4 py-3 shadow-lg"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-text-primary mb-1">
            Sign in to use Deep Analysis
          </p>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Deep Analysis runs your document through a stronger, server-side model.
            Sign in or create an account in the top-right corner to enable it.
          </p>
          <div className="flex flex-wrap gap-2">
            <SignInButton mode="modal">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-2 border border-border text-text-primary hover:bg-surface-3 transition-colors"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
              >
                Sign up
              </button>
            </SignUpButton>
          </div>
        </div>
      )}
    </Layout>
  );
}

function AppHeaderRight() {
  const ai = useAiStore();
  const { isSignedIn } = useAuth();
  const { startTour } = useAppOnboarding();

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3"
      data-tour-id="header-actions"
    >
      <button
        type="button"
        onClick={startTour}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
        data-tour-id="header-tour-button"
      >
        <span className="inline-block w-3 h-3 rounded-full bg-accent/80" />
        Product tour
      </button>
      <select
        value={ai.outputLanguage}
        onChange={(e) => ai.setOutputLanguage(e.target.value as OutputLanguage)}
        aria-label="Output language"
        title="Analysis output language"
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-2 border border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors cursor-pointer"
        data-tour-id="header-language"
      >
        {(Object.entries(OUTPUT_LANGUAGE_LABELS) as [OutputLanguage, string][]).map(
          ([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ),
        )}
      </select>
      <div data-tour-id="header-mode-toggle">
        <ModeToggle compact />
      </div>
      <div className="flex items-center gap-2" data-tour-id="header-account">
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-2 border border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors"
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Sign up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "w-7 h-7" },
            }}
          />
        </SignedIn>
      </div>
      <div data-tour-id="header-privacy">
        <PrivacyBadge />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TourProvider
      steps={ONBOARDING_STEPS}
      padding={8}
      scrollSmooth
      showBadge
      showCloseButton
      showNavigation
      styles={{
        // Keep default opacity animation; just use a lighter overlay color via fill.
        maskWrapper: (base: Record<string, unknown>) => ({ ...base }),
        maskArea: (base: Record<string, unknown>) => ({
          ...base,
          rx: 16,
          fill: "rgba(10,10,11,0.35)",
        }),
        popover: (base: Record<string, unknown>) => ({
          ...base,
          backgroundColor: "var(--color-surface-1)",
          color: "var(--color-text-primary)",
          borderRadius: 12,
          padding: "16px 18px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.75), 0 0 0 1px var(--color-border)",
          textAlign: "left",
        }),
        badge: (base: Record<string, unknown>) => ({ ...base, background: "var(--color-accent)" }),
        close: (base: Record<string, unknown>) => ({ ...base, display: "block" }),
        dot: (base: Record<string, unknown>) => ({ ...base, background: "var(--color-accent)" }),
      } as React.ComponentProps<typeof TourProvider>["styles"]}
    >
      <AppOnboardingProvider>
        <AppContent />
      </AppOnboardingProvider>
    </TourProvider>
  );
}
