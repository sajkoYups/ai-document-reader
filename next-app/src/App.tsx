"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  useAuth,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import WaitlistModal from "./components/WaitlistModal";
import ImagePdfUpgradeModal from "./components/ImagePdfUpgradeModal";
import FeedbackModal from "./components/FeedbackModal";
import UsagePanel from "./components/UsagePanel";
import { OUTPUT_LANGUAGE_LABELS, type OutputLanguage } from "@/types";
import { useDocumentStore } from "@/store/documentStore";
import { useAiStore } from "@/store/aiStore";
import { useChatStore } from "@/store/chatStore";
import { useSessionStore } from "@/store/sessionStore";
import { useEmbeddingStore } from "@/store/embeddingStore";
import { useWorkflowRun } from "@/hooks/useWorkflowRun";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSessionCleanup } from "@/hooks/useSessionCleanup";
import { checkBrowserCompatibility } from "@/lib/compatibility";
import { isLikelyMobileDevice } from "@/lib/deviceUtils";
import { validateFileSize, getSupportedFileType } from "@/lib/documentParser";
import { extractTextFromPdf, MAX_OCR_PAGES, renderPdfPagesAsJpeg } from "@/lib/pdfExtractor";
import {
  buildChatHistory,
  assembleContext,
  extractEvidence,
  type AssembleContextMeta,
} from "@/lib/chatPipeline";
import type { DocumentChunk } from "@/lib/documentChunker";
import { CHAT_TOP_K, EXTRACT_TOP_K } from "@/lib/retrieval";
import {
  apiChatNeedsRetrievedOrTruncatedContext,
  capChatHistoryForApi,
  maxAssembledDocumentCharsForApiChat,
  truncateDocumentForApiChat,
} from "@/lib/contextBudget";
import { estimateTokenCount, MAX_ON_DEVICE_TOKENS } from "@/lib/tokenEstimate";
import { quotaNotice, type AnalysisQuota } from "@/lib/analysisQuota";
import RequestMoreAnalysesButton from "./components/RequestMoreAnalysesButton";
import { checkApiHealth, chatViaApi, ocrViaApi } from "@/lib/apiClient";
import Layout from "./components/Layout";
import PrivacyBadge from "./components/PrivacyBadge";
import ModeToggle from "./components/ModeToggle";
import Button from "./components/Button";
import ProgressBar from "./components/ProgressBar";
import ToastContainer, { showToast } from "./components/Toast";
import DebugPanel, {
  type RagDebugInfo,
  type RetrievalMethod,
} from "./components/DebugPanel";
import { TourProvider, useTour } from "@reactour/tour";
import { ONBOARDING_STEPS, mobilePaneForTourStep } from "@/lib/tourSteps";
import { AppOnboardingProvider, useAppOnboarding } from "./components/AppOnboarding";
import HostedWaitlistPrompt from "./components/HostedWaitlistPrompt";
import WorkflowSelector from "./components/workflows/WorkflowSelector";
import SourcesPanel from "./components/workflows/SourcesPanel";
import ExtractSubmenu from "./components/workflows/ExtractSubmenu";
import EvidenceFinderQuery from "./components/workflows/EvidenceFinderQuery";
import MoreWorkflowsModal from "./components/workflows/MoreWorkflowsModal";
import CapabilityGate from "./components/workflows/CapabilityGate";
import ClassificationBanner from "./components/workflows/ClassificationBanner";
import SessionThread from "./components/workflows/SessionThread";
import { t } from "@/workflows/copy";
import { classifyDocument, suggestedQuestionsForType } from "@/workflows/classify";
import { buildLabeledContext, buildMultiDocLabeledContext } from "@/workflows/evidence";
import { queryForExtract } from "@/workflows/extractQuery";
import { getWorkflow, listPrimary } from "@/workflows/registry";
import { refineQueryFromDraft, schemaForWorkflow } from "@/workflows/schemaFor";
import { usesMultiPassDeep, type ExtractType, type EvidenceReference, type WorkflowId } from "@/workflows/types";
import type { DocumentClassification } from "@/workflows/schemas/classify";
import { MAX_SESSION_DOCUMENTS } from "@/store/documentStore";

function AppContent() {
  const { isSignedIn } = useAuth();
  const doc = useDocumentStore();
  const ai = useAiStore();
  const setApiAvailable = useAiStore((s) => s.setApiAvailable);
  const setIsMobileDevice = useAiStore((s) => s.setIsMobileDevice);
  const setProcessingMode = useAiStore((s) => s.setProcessingMode);
  const processingMode = useAiStore((s) => s.processingMode);
  const embedding = useEmbeddingStore();
  const workflowRun = useWorkflowRun();
  const session = useSessionStore();
  const language = ai.outputLanguage;
  const { isOpen: tourOpen, currentStep } = useTour();

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowId>("summarize");
  const [extractType, setExtractType] = useState<ExtractType>("key-information");
  const [customExtractQuery, setCustomExtractQuery] = useState("");
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gatedWorkflow, setGatedWorkflow] = useState<WorkflowId>("review");
  const [classification, setClassification] = useState<DocumentClassification | null>(null);
  const [evidenceById, setEvidenceById] = useState<Record<string, EvidenceReference>>({});
  const [debugInfo, setDebugInfo] = useState<RagDebugInfo | null>(null);
  const [activeRun, setActiveRun] = useState<{
    workflowId: WorkflowId;
    extractType?: ExtractType;
  } | null>(null);
  const [mobilePane, setMobilePane] = useState<"workflows" | "sources" | null>(null);
  const [imagePdfOpen, setImagePdfOpen] = useState(false);
  const [imagePdfWaitlistOpen, setImagePdfWaitlistOpen] = useState(false);
  const [imageReadNotice, setImageReadNotice] = useState<string | null>(null);
  const [analysisQuota, setAnalysisQuota] = useState<AnalysisQuota | null>(null);
  const tourPane = tourOpen ? mobilePaneForTourStep(currentStep) : null;
  const openPane = tourOpen ? tourPane : mobilePane;
  const lastIndexedText = useRef<string>("");
  const modeInitializedRef = useRef<boolean>(false);
  const pendingWorkflowRef = useRef<WorkflowId | null>(null);
  const extractTypeRef = useRef<ExtractType>(extractType);
  extractTypeRef.current = extractType;

  const compat = useMemo(() => checkBrowserCompatibility(), []);

  const { setWarningCallback, forceCleanup } = useSessionCleanup();

  useEffect(() => {
    setWarningCallback(() => {
      showToast("Session will be cleared in 60 seconds due to inactivity. Move your mouse to stay active.", "info");
    });
  }, [setWarningCallback]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setMobilePane(null);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!tourOpen) setMobilePane(null);
  }, [tourOpen]);

  const refreshAnalysisQuota = useCallback(() => {
    if (!isSignedIn) {
      setAnalysisQuota(null);
      return;
    }
    void fetch("/api/usage/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { quota?: AnalysisQuota } | null) => {
        setAnalysisQuota(json?.quota ?? null);
      })
      .catch(() => {
        // Keep the last known quota. The server still enforces the cap.
      });
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || processingMode !== "api") return;
    refreshAnalysisQuota();
  }, [isSignedIn, processingMode, refreshAnalysisQuota]);

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
    if (isSignedIn) return;
    if (ai.outputLanguage !== "mk") return;
    ai.setOutputLanguage("en");
  }, [isSignedIn, ai]);

  useEffect(() => {
    const isSecure =
      location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isSecure) {
      showToast("Not on HTTPS — encryption and privacy guarantees require a secure connection.", "error");
    }
  }, []);

  useEffect(() => {
    const docs = useDocumentStore.getState().documents;
    if (docs.length === 0) {
      lastIndexedText.current = "";
      embedding.clear();
      return;
    }
    const signature = docs.map((d) => `${d.id}:${d.rawText.length}`).join("|");
    if (signature === lastIndexedText.current) return;
    lastIndexedText.current = signature;
    for (const d of docs) {
      embedding.indexDocument(d.rawText, {
        documentId: d.id,
        documentName: d.fileName ?? "Document",
      });
    }
    if (doc.documentId) embedding.setActiveDocument(doc.documentId);
  }, [doc.documents, doc.documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasDocument = doc.documents.length > 0;
  const isAsk = selectedWorkflow === "ask";
  const selectedDef = getWorkflow(selectedWorkflow);

  useEffect(() => {
    if (!hasDocument) {
      setClassification(null);
      return;
    }
    setClassification(
      classifyDocument(doc.rawText, doc.fileName, language),
    );
  }, [hasDocument, doc.rawText, doc.fileName, language]);

  const loadFileText = useCallback(async (file: File) => {
    const sizeError = validateFileSize(file);
    if (sizeError) {
      doc.setError(sizeError);
      showToast(sizeError, "error");
      return null;
    }
    const fileType = getSupportedFileType(file);
    if (!fileType) {
      const msg = "Unsupported file type. Please upload a PDF, TXT, or Markdown file.";
      doc.setError(msg);
      showToast(msg, "error");
      return null;
    }
    try {
      let text: string;
      let pageCount: number | undefined;
      let pages: { pageNumber: number; startChar: number; endChar: number }[] | undefined;
      if (fileType === "pdf") {
        const extracted = await extractTextFromPdf(file);
        text = extracted.text;
        pageCount = extracted.pageCount;
        pages = extracted.pages;
        if (!text.trim()) {
          const canOcr = processingMode === "api" && isSignedIn === true;
          if (!canOcr) {
            doc.setError(null);
            setImagePdfOpen(true);
            return null;
          }
          if (extracted.pageCount > MAX_OCR_PAGES) {
            const msg = `This scanned PDF has ${extracted.pageCount} pages. Deep Analysis can read up to ${MAX_OCR_PAGES}.`;
            doc.setError(msg);
            showToast(msg, "error");
            return null;
          }
          try {
            setImageReadNotice("Reading page images…");
            const images = await renderPdfPagesAsJpeg(file, (done, total) => {
              setImageReadNotice(`Preparing page images… ${done}/${total}`);
            });
            setImageReadNotice("Reading page images on the server…");
            const ocr = await ocrViaApi(images, language);
            text = ocr.text;
            pageCount = ocr.pageCount;
            pages = ocr.pages;
          } catch {
            doc.setError("Could not read this scanned PDF. Try again.");
            showToast("Could not read this scanned PDF", "error");
            return null;
          }
          if (!text.trim()) {
            doc.setError("Could not extract text from this file.");
            return null;
          }
        }
      } else {
        text = await file.text();
        if (!text.trim()) {
          doc.setError("Could not extract text from this file.");
          return null;
        }
      }
      return { text, fileType, pageCount, pages };
    } catch {
      doc.setError("Failed to read file. It may be corrupted or encrypted.");
      showToast("Failed to read file", "error");
      return null;
    } finally {
      setImageReadNotice(null);
    }
  }, [doc, isSignedIn, language, processingMode]);

  const handleFile = useCallback(
    async (file: File) => {
      const loaded = await loadFileText(file);
      if (!loaded) return;

      if (useDocumentStore.getState().documents.length === 0) {
        doc.setFromFile(loaded.text, file.name, loaded.fileType, {
          pageCount: loaded.pageCount,
          pages: loaded.pages,
        });
        useSessionStore.getState().clear();
        useChatStore.getState().clear();
        workflowRun.reset();
        setEvidenceById({});
        setDebugInfo(null);
        setActiveRun(null);
      } else {
        const result = doc.addFromFile(loaded.text, file.name, loaded.fileType, {
          pageCount: loaded.pageCount,
          pages: loaded.pages,
        });
        if (!result.ok) {
          showToast(result.error, "error");
          return;
        }
      }
      setClassification(null);
      showToast(`Loaded ${file.name}`, "success");
    },
    [doc, loadFileText, workflowRun],
  );

  const handleAddFile = useCallback(async (file: File) => {
    if (useDocumentStore.getState().documents.length >= MAX_SESSION_DOCUMENTS) {
      showToast(t(language, "doc.maxReached"), "info");
      return;
    }
    const loaded = await loadFileText(file);
    if (!loaded) return;
    const result = doc.addFromFile(loaded.text, file.name, loaded.fileType, {
      pageCount: loaded.pageCount,
      pages: loaded.pages,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Added ${file.name}`, "success");
  }, [doc, language, loadFileText]);

  const handleReplaceFile = useCallback(async (id: string, file: File) => {
    const loaded = await loadFileText(file);
    if (!loaded) return;
    doc.replaceDocument(id, loaded.text, file.name, loaded.fileType, {
      pageCount: loaded.pageCount,
      pages: loaded.pages,
    });
    embedding.removeDocument(id);
    embedding.indexDocument(loaded.text, {
      documentId: id,
      documentName: file.name,
    });
    showToast(`Replaced with ${file.name}`, "success");
  }, [doc, embedding, loadFileText]);

  const MAX_DIRECT_CHARS = 10000;

  const isModelReady = ai.processingMode === "api" || ai.modelStatus === "ready";
  const canUseDeepAnalysis = ai.processingMode !== "api" || isSignedIn === true;
  const isOnDevice = ai.processingMode !== "api";
  const estimatedTokens = hasDocument ? estimateTokenCount(doc.rawText) : 0;
  const isOverOnDeviceLimit =
    isOnDevice && hasDocument && estimatedTokens > MAX_ON_DEVICE_TOKENS;
  const isIndexing =
    hasDocument &&
    doc.rawText.length > MAX_DIRECT_CHARS &&
    (embedding.status === "loading-model" || embedding.status === "indexing");

  const schemaFor = schemaForWorkflow;

  const handleRun = useCallback(async (overrides?: {
    workflowId?: WorkflowId;
    extractType?: ExtractType;
  }) => {
    const workflowId = overrides?.workflowId ?? selectedWorkflow;
    const runExtractType = overrides?.extractType ?? extractTypeRef.current;
    if (!hasDocument || !isModelReady || workflowRun.isProcessing) return;
    if (useSessionStore.getState().isGenerating) return;
    if (workflowId === "ask") return;
    const def = getWorkflow(workflowId);
    if (!def || def.status !== "ready") return;
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
    if (ai.processingMode === "api" && analysisQuota?.status === "blocked") {
      const message = quotaNotice(analysisQuota);
      if (message) showToast(message, "error");
      return;
    }
    if (isOverOnDeviceLimit) {
      showToast(
        "Document is too long for on-device analysis. Use Deep Analysis or shorten the document.",
        "error",
      );
      return;
    }

    if (def.minDocuments > doc.documents.length) {
      showToast(t(language, "doc.needTwo"), "info");
      return;
    }

    const state = useDocumentStore.getState();
    const active = state.getActive();
    if (!active) return;

    if (workflowId === "compare") {
      state.ensureCompareRoles();
    }
    const roles = useDocumentStore.getState().compareRoles;

    let labeledText = "";
    let evidenceSnapshot: Record<string, EvidenceReference> = {};
    let chunks: DocumentChunk[] = [];
    let method: RagDebugInfo["method"] = "direct";
    let query: string | undefined;
    let totalDocChars = active.rawText.length;
    let totalDocChunks = embedding.chunks.length;

    try {
      if (workflowId === "compare") {
        const a = roles.a ? state.getById(roles.a) : null;
        const b = roles.b ? state.getById(roles.b) : null;
        if (!a || !b) {
          showToast(t(language, "doc.needTwo"), "info");
          return;
        }
        totalDocChars = a.rawText.length + b.rawText.length;
        const spread = embedding.getSpreadChunksForDocs(MAX_DIRECT_CHARS, [
          { id: a.id, sections: a.sections },
          { id: b.id, sections: b.sections },
        ]);
        chunks = spread;
        method = "spread";
        const labeled = buildMultiDocLabeledContext(
          [
            {
              documentId: a.id,
              documentName: a.fileName ?? "Document A",
              pages: a.pages,
              sections: a.sections,
              chunks: spread.filter((c) => c.documentId === a.id),
              idPrefix: "A",
            },
            {
              documentId: b.id,
              documentName: b.fileName ?? "Document B",
              pages: b.pages,
              sections: b.sections,
              chunks: spread.filter((c) => c.documentId === b.id),
              idPrefix: "B",
            },
          ],
          MAX_DIRECT_CHARS,
        );
        labeledText = labeled.text;
        evidenceSnapshot = labeled.evidenceById;
      } else if (workflowId === "timeline" && state.documents.length > 1) {
        totalDocChars = state.documents.reduce((s, d) => s + d.rawText.length, 0);
        const spread = embedding.getSpreadChunksForDocs(
          MAX_DIRECT_CHARS,
          state.documents.map((d) => ({ id: d.id, sections: d.sections })),
        );
        chunks = spread;
        method = "spread";
        const labeled = buildMultiDocLabeledContext(
          state.documents.map((d) => ({
            documentId: d.id,
            documentName: d.fileName ?? "Document",
            pages: d.pages,
            sections: d.sections,
            chunks: spread.filter((c) => c.documentId === d.id),
          })),
          MAX_DIRECT_CHARS,
        );
        labeledText = labeled.text;
        evidenceSnapshot = labeled.evidenceById;
      } else {
        const isShortDoc = active.rawText.length <= MAX_DIRECT_CHARS;
        const activeChunks = embedding.indexes[active.id]?.chunks ?? embedding.chunks;
        totalDocChunks = activeChunks.length;
        if (isShortDoc || activeChunks.length === 0) {
          chunks = activeChunks.length > 0
            ? activeChunks
            : [{ text: active.rawText, index: 0, startChar: 0, endChar: active.rawText.length, documentId: active.id, documentName: active.fileName ?? "Document" }];
          method = "direct";
        } else if (workflowId === "extract") {
          query = queryForExtract(runExtractType, customExtractQuery);
          chunks = await embedding.retrieveChunksHybrid(query, EXTRACT_TOP_K, {
            useMMR: false,
            documentIds: [active.id],
          });
          method = embedding.status === "ready" ? "hybrid" : "keyword-fallback";
        } else if (workflowId === "evidence-finder") {
          query = evidenceQuery.trim() || "key passages evidence";
          chunks = await embedding.retrieveChunksHybrid(query, EXTRACT_TOP_K, {
            useMMR: false,
            documentIds: [active.id],
          });
          method = embedding.status === "ready" ? "hybrid" : "keyword-fallback";
        } else {
          chunks = embedding.getSpreadChunks(MAX_DIRECT_CHARS, active.sections, active.id);
          method = "spread";
        }
        const labeled = buildLabeledContext(
          chunks,
          active.pages,
          active.sections,
          active.id,
          active.fileName ?? "Document",
          MAX_DIRECT_CHARS,
        );
        labeledText = labeled.text;
        evidenceSnapshot = labeled.evidenceById;
      }
    } catch {
      chunks = embedding.chunks.slice(0, 8);
      method = "fallback";
      labeledText = active.rawText;
    }

    setEvidenceById(evidenceSnapshot);
    setActiveRun({
      workflowId,
      extractType: workflowId === "extract" ? runExtractType : undefined,
    });
    setDebugInfo({
      method,
      query,
      retrievedChunks: chunks,
      contextMeta: {
        chunksIncluded: chunks.length,
        totalChars: labeledText.length,
        truncatedChunks: 0,
        gapMarkers: 0,
      },
      totalDocChars,
      totalDocChunks,
      timestamp: Date.now(),
    });

    const documentId = active.id;
    const customQuery =
      workflowId === "extract"
        ? customExtractQuery
        : workflowId === "evidence-finder"
          ? evidenceQuery
          : undefined;
    let outcome = await workflowRun.run({
      workflowId,
      documentText: labeledText || active.rawText,
      schema: schemaFor(workflowId),
      extractType: workflowId === "extract" ? runExtractType : undefined,
      customQuery,
    });
    if (ai.processingMode === "api") refreshAnalysisQuota();
    if (!outcome) {
      setActiveRun(null);
      return;
    }
    if (useDocumentStore.getState().getActive()?.id !== documentId) {
      setActiveRun(null);
      return;
    }

    if (
      outcome.ok &&
      usesMultiPassDeep(workflowId) &&
      ai.processingMode === "api"
    ) {
      try {
        const refineQ = refineQueryFromDraft(workflowId, outcome.data);
        const more = await embedding.retrieveChunksHybrid(refineQ, EXTRACT_TOP_K, {
          useMMR: false,
          documentIds:
            workflowId === "compare" && roles.a && roles.b
              ? [roles.a, roles.b]
              : [documentId],
        });
        const refineLabeled = buildLabeledContext(
          more,
          active.pages,
          active.sections,
          active.id,
          active.fileName ?? "Document",
          Math.floor(MAX_DIRECT_CHARS / 2),
        );
        evidenceSnapshot = { ...evidenceSnapshot, ...refineLabeled.evidenceById };
        setEvidenceById(evidenceSnapshot);
        const refined = await workflowRun.refine(refineLabeled.text);
        if (refined?.ok) outcome = refined;
      } catch {
        // Keep first-pass outcome.
      }
    }

    useSessionStore.getState().appendWorkflow({
      workflowId,
      extractType: workflowId === "extract" ? runExtractType : undefined,
      result: outcome.ok ? outcome.data : undefined,
      error: outcome.ok ? undefined : outcome.error,
      evidenceById: evidenceSnapshot,
    });
    setActiveRun(null);
    workflowRun.reset();
  }, [
    hasDocument,
    isModelReady,
    isIndexing,
    isOverOnDeviceLimit,
    workflowRun,
    selectedWorkflow,
    extractType,
    customExtractQuery,
    evidenceQuery,
    language,
    doc.documents,
    doc.rawText,
    doc.sections,
    doc.pages,
    doc.documentId,
    doc.fileName,
    embedding,
    ai.processingMode,
    isSignedIn,
    analysisQuota,
    refreshAnalysisQuota,
  ]);

  const autoRunArmedRef = useRef(false);
  useEffect(() => {
    // Selecting a workflow on the empty state should run once the document is ready.
    if (!hasDocument || !autoRunArmedRef.current) return;
    if (!isModelReady || isIndexing || workflowRun.isProcessing) return;
    if (selectedWorkflow === "ask") {
      autoRunArmedRef.current = false;
      return;
    }
    const def = getWorkflow(selectedWorkflow);
    if (!def || def.status !== "ready") {
      autoRunArmedRef.current = false;
      return;
    }
    if (def.minDocuments > doc.documents.length) {
      return;
    }
    if (!def.localSupported && processingMode === "local") {
      // Capability gate: never silent-switch; prompt the user instead.
      autoRunArmedRef.current = false;
      pendingWorkflowRef.current = selectedWorkflow;
      setGatedWorkflow(selectedWorkflow);
      setGateOpen(true);
      return;
    }
    autoRunArmedRef.current = false;
    void handleRun();
  }, [
    hasDocument,
    isModelReady,
    isIndexing,
    selectedWorkflow,
    processingMode,
    workflowRun.isProcessing,
    handleRun,
    doc.documents.length,
  ]);

  const handleChatSend = async (message: string) => {
    if (workflowRun.isProcessing) return;
    if (useSessionStore.getState().isGenerating) return;
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

    const totalDocChars = doc.rawText.length;
    const totalDocChunks = embedding.chunks.length;
    const priorMessages = useSessionStore.getState().chatMessages();

    if (ai.processingMode === "api") {
      // Prior turns only — server appends `message` again; including the current
      // question in history would duplicate the last user message for the LLM.
      const history = capChatHistoryForApi(buildChatHistory(priorMessages));
      const maxAssembled = maxAssembledDocumentCharsForApiChat(history, message);

      let documentForApi: string;
      let retrievedChunks: DocumentChunk[] = [];
      let method: RetrievalMethod = "direct";
      let contextMeta: AssembleContextMeta;

      try {
        if (
          apiChatNeedsRetrievedOrTruncatedContext(
            doc.rawText,
            history,
            message,
          )
        ) {
          if (embedding.chunks.length > 0) {
            retrievedChunks = await embedding.retrieveChunksHybrid(
              message,
              CHAT_TOP_K,
            );
            const assembled = assembleContext(retrievedChunks, maxAssembled);
            documentForApi = assembled.text;
            contextMeta = assembled.meta;
            method =
              embedding.status === "ready" ? "hybrid" : "keyword-fallback";
          } else {
            documentForApi = truncateDocumentForApiChat(
              doc.rawText,
              maxAssembled,
            );
            contextMeta = {
              chunksIncluded: 0,
              totalChars: documentForApi.length,
              truncatedChunks: 0,
              gapMarkers: 0,
            };
            method = "truncated";
          }
        } else {
          documentForApi = doc.rawText;
          contextMeta = {
            chunksIncluded: 0,
            totalChars: totalDocChars,
            truncatedChunks: 0,
            gapMarkers: 0,
          };
          method = "direct";
        }
      } catch {
        documentForApi = truncateDocumentForApiChat(doc.rawText, maxAssembled);
        contextMeta = {
          chunksIncluded: 0,
          totalChars: documentForApi.length,
          truncatedChunks: 0,
          gapMarkers: 0,
        };
        method = "fallback";
        showToast(
          "Could not retrieve matching sections; using a truncated document for this reply.",
          "info",
        );
      }

      const thread = useSessionStore.getState();
      thread.addUserMessage(message);
      thread.startAssistantMessage();

      setDebugInfo({
        method,
        query: message,
        retrievedChunks,
        contextMeta,
        totalDocChars,
        totalDocChunks,
        timestamp: Date.now(),
      });

      const labeledAsk =
        retrievedChunks.length > 0
          ? buildLabeledContext(
              retrievedChunks,
              doc.pages,
              doc.sections,
              doc.documentId,
              doc.fileName ?? "Document",
              maxAssembled,
            )
          : null;
      const evidenceRefs = labeledAsk
        ? Object.values(labeledAsk.evidenceById).slice(0, 5)
        : undefined;

      chatViaApi(
        documentForApi,
        message,
        history,
        ai.outputLanguage,
        (token) => useSessionStore.getState().appendToLastAssistant(token),
      )
        .then((result) => {
          const evidence = extractEvidence(result, doc.sections);
          useSessionStore.getState().finalizeAssistantMessage(
            evidence.length > 0 ? evidence : undefined,
            evidenceRefs && evidenceRefs.length > 0 ? evidenceRefs : undefined,
          );
        })
        .catch((err) =>
          useSessionStore.getState().setAssistantError(
            err instanceof Error ? err.message : String(err),
          ),
        );
      return;
    }

    const thread = useSessionStore.getState();
    thread.addUserMessage(message);
    thread.startAssistantMessage();

    const history = buildChatHistory([
      ...priorMessages,
      { role: "user" as const, content: message },
    ]);

    let contextDoc: string;
    let askEvidenceRefs: EvidenceReference[] | undefined;
    if (embedding.chunks.length > 0) {
      try {
        const retrievedChunks = await embedding.retrieveChunksHybrid(message, CHAT_TOP_K);
        const { text, meta } = assembleContext(retrievedChunks);
        contextDoc = text;
        const labeledAsk = buildLabeledContext(
          retrievedChunks,
          doc.pages,
          doc.sections,
          doc.documentId,
          doc.fileName ?? "Document",
          MAX_DIRECT_CHARS,
        );
        askEvidenceRefs = Object.values(labeledAsk.evidenceById).slice(0, 5);
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
      (token) => useSessionStore.getState().appendToLastAssistant(token),
      (result) => {
        const evidence = extractEvidence(result, doc.sections);
        useSessionStore.getState().finalizeAssistantMessage(
          evidence.length > 0 ? evidence : undefined,
          askEvidenceRefs && askEvidenceRefs.length > 0 ? askEvidenceRefs : undefined,
        );
      },
      (error) => useSessionStore.getState().setAssistantError(error),
    );
  };

  const handleClear = useCallback(() => {
    doc.clear();
    workflowRun.reset();
    useSessionStore.getState().clear();
    useChatStore.getState().clear();
    embedding.clear();
    lastIndexedText.current = "";
    setClassification(null);
    setEvidenceById({});
    setActiveRun(null);
    forceCleanup();
    showToast("Session cleared", "info");
  }, [doc, workflowRun, embedding, forceCleanup]);

  const applyWorkflow = useCallback(
    (id: WorkflowId) => {
      const def = getWorkflow(id);
      if (!def || def.status !== "ready") {
        if (def?.status === "coming_soon") {
          showToast(t(language, "comingSoon"), "info");
        }
        return;
      }
      setSelectedWorkflow(id);
      if (id === "extract") {
        setExtractType("key-information");
      }
      if (id === "compare") {
        useDocumentStore.getState().ensureCompareRoles();
      }
    },
    [language],
  );

  const handleWorkflowSelect = useCallback(
    (id: WorkflowId) => {
      const def = getWorkflow(id);
      if (!def) return;
      if (def.status === "coming_soon") {
        showToast(t(language, "comingSoon"), "info");
        return;
      }
      if (!hasDocument && id !== "ask") {
        autoRunArmedRef.current = true;
      }
      const needsMoreDocs = def.minDocuments > doc.documents.length;
      if (needsMoreDocs) {
        showToast(t(language, "doc.needTwo"), "info");
      }
      if (!needsMoreDocs && !def.localSupported && processingMode === "local") {
        pendingWorkflowRef.current = id;
        setGatedWorkflow(id);
        setGateOpen(true);
        return;
      }
      applyWorkflow(id);
      setMoreOpen(false);
    },
    [applyWorkflow, doc.documents.length, hasDocument, language, processingMode],
  );

  const handleGateContinue = useCallback(() => {
    setGateOpen(false);
    setProcessingMode("api");
    const pending = pendingWorkflowRef.current;
    pendingWorkflowRef.current = null;
    if (pending) applyWorkflow(pending);
  }, [applyWorkflow, setProcessingMode]);

  useKeyboardShortcuts({
    onRun: handleRun,
    onClear: handleClear,
  });

  const [waitlistBannerOpen, setWaitlistBannerOpen] = useState(false);

  const analysisQuotaNotice =
    processingMode === "api" && analysisQuota ? quotaNotice(analysisQuota) : null;
  const deepAnalysisBlocked =
    processingMode === "api" && analysisQuota?.status === "blocked";

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
          <p className="text-xs text-text-secondary">
            Please use a modern browser like Chrome, Edge, or Firefox over HTTPS so secure Web Crypto–based encryption is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      variant="workspace"
      modelStatus={ai.modelStatus}
      inferenceDevice={ai.inferenceDevice}
      headerRight={<AppHeaderRight />}
      headerStart={
        <div className="flex lg:hidden items-center gap-1">
          <WorkspacePaneButton
            label={t(language, "workspace.openWorkflows")}
            pressed={openPane === "workflows"}
            onClick={() =>
              setMobilePane((pane) => (pane === "workflows" ? null : "workflows"))
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </WorkspacePaneButton>
          <WorkspacePaneButton
            label={t(language, "workspace.openSources")}
            pressed={openPane === "sources"}
            onClick={() =>
              setMobilePane((pane) => (pane === "sources" ? null : "sources"))
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </WorkspacePaneButton>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <ToastContainer />

        {ai.isMobileDevice ? (
          <div
            role="status"
            className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-secondary animate-fade-in"
            aria-live="polite"
          >
            On mobile, use Deep Analysis (API). Standard/local model is desktop-only.
          </div>
        ) : null}

        {analysisQuotaNotice && openPane !== "workflows" ? (
          <div
            role="status"
            className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-text-secondary animate-fade-in"
            aria-live="polite"
          >
            {analysisQuotaNotice}
            {deepAnalysisBlocked ? (
              <RequestMoreAnalysesButton className="mt-2 lg:hidden" />
            ) : null}
          </div>
        ) : null}

        {(ai.modelStatus === "downloading" || ai.modelStatus === "loading") && !ai.isMobileDevice ? (
          <div className="shrink-0 px-4 pt-3 animate-fade-in">
            <ProgressBar
              progress={ai.downloadProgress}
              label={
                ai.currentFile
                  ? `Building model: ${ai.currentFile.split("/").pop()}`
                  : "Loading AI model"
              }
            />
          </div>
        ) : null}

        {embedding.status === "loading-model" || embedding.status === "indexing" ? (
          <div className="shrink-0 px-4 pt-3 animate-fade-in">
            <ProgressBar
              progress={embedding.status === "indexing" ? 90 : embedding.downloadProgress}
              label={
                embedding.status === "indexing"
                  ? "Preparing document — run analysis when ready"
                  : "Building search model..."
              }
            />
          </div>
        ) : null}

        <div className="relative flex-1 min-h-0 flex">
          {openPane && !tourOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/50 lg:hidden"
              aria-label={t(language, "workspace.closePane")}
              onClick={() => setMobilePane(null)}
            />
          ) : null}

          <aside
            className={`
              flex flex-col w-60 shrink-0 border-r border-border bg-surface-0
              max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:w-72 max-lg:shadow-2xl
              ${openPane === "workflows" ? "max-lg:flex" : "max-lg:hidden"}
              lg:flex
            `}
            data-tour-id="task-selector"
          >
            <div className="shrink-0 px-3 py-3 border-b border-border-subtle">
              <p className="text-xs font-medium text-text-muted tracking-wide uppercase">
                {t(language, "workspace.workflows")}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {t(language, "workflow.chooseThenRun")}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2">
              <WorkflowSelector
                workflows={listPrimary()}
                selectedId={selectedWorkflow}
                language={language}
                onSelect={handleWorkflowSelect}
                compact
                afterSelected={
                  selectedWorkflow === "extract" ? (
                    <ExtractSubmenu
                      language={language}
                      selected={extractType}
                      customQuery={customExtractQuery}
                      onSelect={(type) => {
                        extractTypeRef.current = type;
                        setExtractType(type);
                      }}
                      onCustomQueryChange={setCustomExtractQuery}
                    />
                  ) : selectedWorkflow === "evidence-finder" ? (
                    <EvidenceFinderQuery
                      language={language}
                      value={evidenceQuery}
                      onChange={setEvidenceQuery}
                      disabled={workflowRun.isProcessing || !hasDocument}
                    />
                  ) : null
                }
              />
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="w-full text-left px-2.5 py-1.5 text-sm text-accent hover:underline cursor-pointer"
              >
                {t(language, "empty.more")} →
              </button>
            </div>
            <div
              className="shrink-0 px-3 py-3 border-t border-border-subtle space-y-2"
              data-tour-id="run-button"
            >
              {isAsk ? (
                <p className="text-xs text-text-secondary leading-snug">
                  {t(language, "workspace.askHint")}
                </p>
              ) : (
                <>
                  {ai.modelStatus === "error" ? (
                    <div className="space-y-2">
                      <div className="px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                        {ai.error ?? "Failed to load model"}
                      </div>
                      <Button variant="secondary" size="lg" onClick={() => ai.loadModel()} className="w-full">
                        Retry
                      </Button>
                    </div>
                  ) : null}
                  {isOnDevice && hasDocument ? (
                    <p className="text-xs text-text-muted">
                      ~{estimatedTokens.toLocaleString()} tokens
                      {isOverOnDeviceLimit ? " · Too long for on-device · Use Deep Analysis." : null}
                    </p>
                  ) : null}
                  {analysisQuotaNotice ? (
                    <div className="space-y-2" role="status">
                      <p className="text-xs text-text-secondary leading-snug">
                        {analysisQuotaNotice}
                      </p>
                      {deepAnalysisBlocked ? (
                        <RequestMoreAnalysesButton align="start" />
                      ) : null}
                    </div>
                  ) : null}
                  {workflowRun.isProcessing ? (
                    <Button variant="secondary" size="lg" onClick={workflowRun.stop} className="w-full">
                      {t(language, "run.stop")}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        setMobilePane(null);
                        void handleRun();
                      }}
                      disabled={
                        !hasDocument ||
                        !isModelReady ||
                        !canUseDeepAnalysis ||
                        isIndexing ||
                        isOverOnDeviceLimit ||
                        deepAnalysisBlocked ||
                        selectedDef?.status !== "ready" ||
                        session.isGenerating ||
                        (selectedDef != null && selectedDef.minDocuments > doc.documents.length) ||
                        (selectedWorkflow === "evidence-finder" && !evidenceQuery.trim()) ||
                        (selectedWorkflow === "extract" && extractType === "custom" && !customExtractQuery.trim())
                      }
                      className="w-full"
                    >
                      {!isModelReady
                        ? t(language, "run.modelLoading")
                        : isIndexing
                          ? t(language, "run.preparing")
                          : `${t(language, "run.label")} ${t(language, selectedDef?.nameKey ?? "workflow.summarize.name")}`}
                    </Button>
                  )}
                </>
              )}
            </div>
          </aside>

          <section
            className="flex-1 min-w-0 min-h-0 flex flex-col bg-surface-0"
            data-tour-id="output-section"
          >
            {classification ? (
              <div className="shrink-0 px-4 pt-3">
                <ClassificationBanner
                  language={language}
                  label={classification.label}
                  recommendedIds={classification.recommendedWorkflowIds as WorkflowId[]}
                  onSelect={handleWorkflowSelect}
                />
              </div>
            ) : null}
            <div className="flex-1 min-h-0">
              <SessionThread
                language={language}
                entries={session.entries}
                liveWorkflowId={activeRun?.workflowId ?? selectedWorkflow}
                liveExtractType={activeRun?.extractType ?? extractType}
                isProcessing={workflowRun.isProcessing}
                isRepairing={workflowRun.isRepairing}
                isGenerating={session.isGenerating}
                liveError={workflowRun.error}
                livePartial={workflowRun.partial}
                liveValidated={workflowRun.validated}
                liveEvidenceById={evidenceById}
                documentNames={Object.fromEntries(
                  doc.documents.map((d) => [d.id, d.fileName ?? "Document"]),
                )}
                extraQuestions={
                  classification
                    ? suggestedQuestionsForType(classification.type)
                    : undefined
                }
                showAskComposer={isAsk && hasDocument}
                composerDisabled={!isModelReady || !canUseDeepAnalysis || isIndexing}
                composerDisabledReason={
                  isIndexing
                    ? "You can ask questions once the document has finished preparing."
                    : undefined
                }
                onSend={handleChatSend}
                onClear={() => {
                  workflowRun.reset();
                  setActiveRun(null);
                  useSessionStore.getState().clear();
                  useChatStore.getState().clear();
                }}
                onStop={() => {
                  workflowRun.stop();
                  setActiveRun(null);
                }}
                onAsk={(message) => {
                  setSelectedWorkflow("ask");
                  void handleChatSend(message);
                }}
                onFollowUp={(text) => {
                  setSelectedWorkflow("ask");
                  void handleChatSend(text);
                }}
                onRerun={(workflowId, runExtractType) => {
                  setSelectedWorkflow(workflowId);
                  if (runExtractType) {
                    extractTypeRef.current = runExtractType;
                    setExtractType(runExtractType);
                  }
                  void handleRun({ workflowId, extractType: runExtractType });
                }}
              />
            </div>
            <DebugPanel debugInfo={debugInfo} />
          </section>

          <aside
            className={`
              flex flex-col w-72 shrink-0 border-l border-border bg-surface-0
              max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-80 max-lg:shadow-2xl
              ${openPane === "sources" ? "max-lg:flex" : "max-lg:hidden"}
              lg:flex
            `}
            data-tour-id="sources-panel"
          >
            <SourcesPanel
              language={language}
              documents={doc.documents}
              activeDocumentId={doc.activeDocumentId}
              isHosted={processingMode === "api"}
              showCompareRoles={selectedWorkflow === "compare"}
              compareRoles={doc.compareRoles}
              pasteValue={doc.rawText}
              error={doc.error}
              notice={imageReadNotice}
              onSelect={(id) => {
                doc.setActive(id);
                embedding.setActiveDocument(id);
              }}
              onFile={(file) => {
                setMobilePane(null);
                void handleFile(file);
              }}
              onAdd={(file) => void handleAddFile(file)}
              onReplace={(id, file) => void handleReplaceFile(id, file)}
              onRemove={(id) => {
                embedding.removeDocument(id);
                doc.removeDocument(id);
                if (useDocumentStore.getState().documents.length === 0) {
                  handleClear();
                }
              }}
              onClearAll={handleClear}
              onPasteChange={(value) => doc.setText(value)}
              onCompareRoleChange={(side, id) => {
                doc.setCompareRoles({ [side]: id });
              }}
            />
          </aside>
        </div>
      </div>

      <MoreWorkflowsModal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        language={language}
        suggestedIds={
          (classification?.recommendedWorkflowIds as WorkflowId[] | undefined) ?? [
            "review",
            "extract",
            "summarize",
          ]
        }
        onSelect={handleWorkflowSelect}
      />
      <CapabilityGate
        open={gateOpen}
        workflowId={gatedWorkflow}
        language={language}
        onContinue={handleGateContinue}
        onCancel={() => {
          setGateOpen(false);
          pendingWorkflowRef.current = null;
          autoRunArmedRef.current = false;
        }}
      />

      {ai.processingMode === "api" && !isSignedIn && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-sm animate-fade-in
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
            <button
              type="button"
              onClick={() => setWaitlistBannerOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Join Waitlist
            </button>
            <WaitlistModal
              open={waitlistBannerOpen}
              onClose={() => setWaitlistBannerOpen(false)}
            />
          </div>
        </div>
      )}

      <HostedWaitlistPrompt />
      <ImagePdfUpgradeModal
        open={imagePdfOpen}
        signedIn={isSignedIn === true}
        onClose={() => setImagePdfOpen(false)}
        onJoinWaitlist={() => {
          setImagePdfOpen(false);
          setImagePdfWaitlistOpen(true);
        }}
        onSwitchToDeep={() => {
          setProcessingMode("api");
          setImagePdfOpen(false);
          showToast("Deep Analysis is on. Upload the PDF again.", "info");
        }}
      />
      <WaitlistModal
        open={imagePdfWaitlistOpen}
        onClose={() => setImagePdfWaitlistOpen(false)}
      />
    </Layout>
  );
}

function WorkspacePaneButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer ${
        pressed
          ? "border-accent-border bg-accent-dim text-accent"
          : "border-border bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3"
      }`}
    >
      {children}
    </button>
  );
}

function AppHeaderRight() {
  const ai = useAiStore();
  const { isSignedIn } = useAuth();
  const { startTour } = useAppOnboarding();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const canUseMacedonian = isSignedIn === true;

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3"
      data-tour-id="header-actions"
    >
      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        data-tour-id="header-feedback"
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <button
        type="button"
        onClick={startTour}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
        data-tour-id="header-tour-button"
      >
        <span className="inline-block w-3 h-3 rounded-full bg-accent/80" />
        Product tour
      </button>
      <select
        value={ai.outputLanguage}
        onChange={(e) => {
          const nextLanguage = e.target.value as OutputLanguage;
          if (nextLanguage === "mk" && !canUseMacedonian) return;
          ai.setOutputLanguage(nextLanguage);
        }}
        aria-label="Output language"
        title="Analysis output language"
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-2 border border-border text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors cursor-pointer"
        data-tour-id="header-language"
      >
        {(Object.entries(OUTPUT_LANGUAGE_LABELS) as [OutputLanguage, string][]).map(
          ([code, label]) => (
            <option key={code} value={code} disabled={code === "mk" && !canUseMacedonian}>
              {label}
            </option>
          ),
        )}
      </select>
      {!canUseMacedonian && (
        <p className="text-xs text-text-secondary">Sign in to enable Macedonian.</p>
      )}
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
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
          >
            Join Waitlist
          </button>
          <WaitlistModal
            open={waitlistOpen}
            onClose={() => setWaitlistOpen(false)}
          />
        </SignedOut>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "w-7 h-7" },
            }}
          >
            <UserButton.UserProfilePage
              label="Usage"
              url="usage"
              labelIcon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden="true"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-4 4 4 4-7" />
                </svg>
              }
            >
              <UsagePanel />
            </UserButton.UserProfilePage>
          </UserButton>
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
      position="center"
      padding={{ mask: 8, popover: 10 }}
      scrollSmooth
      showBadge={false}
      showCloseButton
      showNavigation
      disableInteraction
      highlightedMaskClassName="tour-highlight"
      styles={{
        maskWrapper: (base: Record<string, unknown>) => ({
          ...base,
          opacity: 0.8,
          color: "#000",
          zIndex: 10000,
        }),
        maskArea: (base: Record<string, unknown>) => ({
          ...base,
          fill: "black",
          rx: 12,
        }),
        highlightedArea: (base: Record<string, unknown>) => ({
          ...base,
          display: "block",
          fill: "rgba(255, 255, 255, 0.06)",
          stroke: "var(--color-accent)",
          strokeWidth: 2,
          rx: 12,
          filter: "drop-shadow(0 0 12px rgba(45, 212, 191, 0.65))",
        }),
        popover: (base: Record<string, unknown>) => ({
          ...base,
          zIndex: 10001,
          backgroundColor: "var(--color-surface-1)",
          color: "var(--color-text-primary)",
          borderRadius: 12,
          boxSizing: "border-box",
          width: "min(calc(100vw - 32px), 560px)",
          maxWidth: "min(calc(100vw - 32px), 560px)",
          maxHeight: "calc(100dvh - 32px)",
          overflowX: "hidden",
          overflowY: "auto",
          padding: "28px 28px 20px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.75), 0 0 0 1px var(--color-border)",
          textAlign: "left",
        }),
        close: (base: Record<string, unknown>) => ({
          ...base,
          display: "block",
          top: 16,
          right: 16,
        }),
        dot: (base: Record<string, unknown>) => ({ ...base, background: "var(--color-accent)" }),
      } as React.ComponentProps<typeof TourProvider>["styles"]}
    >
      <AppOnboardingProvider>
        <AppContent />
      </AppOnboardingProvider>
    </TourProvider>
  );
}
