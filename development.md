# Private On‑Device AI Assistant — Beta Product Plan

## 1. Vision

Build a privacy‑first AI assistant that analyzes and generates documents entirely on the user’s device (browser). No accounts, no cloud processing, no file storage. The product should behave like a trustworthy private assistant for sensitive work.

**Core principle:** User data never leaves the device for the free tier. The premium tier sends data to a private backend with end‑to‑end encryption — the server processes in memory only and stores nothing.

---

## 2. Beta Goals (MVP)

### Functional Goals

* Analyze documents locally (paste text or upload file)
* Generate new documents from prompts
* Explain complex text in plain language
* Summarize long content
* Extract key points, obligations, risks, dates
* Q&A over the provided text

### Non‑Functional Goals

* Zero backend dependency for AI processing
* No user accounts
* No saving of documents
* No telemetry that captures user content
* Fast startup after model download
* Works on modern desktop browsers

---

## 3. Privacy Model

### Privacy Guarantees — Local Mode (Free)

* All processing occurs locally in the browser
* Documents are not uploaded to servers
* No persistent storage of user files
* Closing the page clears the session data
* Only static assets are served from hosting

### Privacy Guarantees — Deep Analysis Mode (Premium, Account‑Gated Later)

* Document text is encrypted client‑side with AES‑256‑GCM before transmission
* End‑to‑end encryption via ECDH (P‑256) key exchange — even a compromised TLS proxy cannot read payloads
* Server processes in memory only — zero persistence (no database, no file writes, no Redis)
* Server logging never includes request/response bodies
* Session keys are ephemeral and auto‑expire after 30 minutes
* Server‑side AES keys are overwritten with zeros on session expiry

### Client‑Side Encryption at Rest

* A per‑session AES‑256‑GCM key is generated on page load (non‑extractable via WebCrypto)
* All document text stored in Zustand is encrypted in memory
* Encrypted buffers are overwritten with random data before releasing on session clear
* Web Workers are terminated (not just cleared) on session end
* 15‑minute idle timeout with auto‑clear of all session data

### Explicit Non‑Goals (Beta)

* No cloud sync
* No collaboration features
* No recovery of lost data

---

## 4. Target Users (Beta)

Primary early adopters:

* Founders and executives handling sensitive documents
* Consultants and agencies
* Legal and financial professionals (light use cases)
* Privacy‑conscious users

---

## 5. Core Use Cases

1. "Explain this document to me"
2. "Summarize this report"
3. "What are the risks or obligations here?"
4. "Rewrite this in simpler language"
5. "Draft a document based on this description"
6. "Answer questions about this text"
7. **Chat with document:** Ask natural-language questions about the uploaded/pasted document (e.g., “Is termination covered?”, “Where is payment defined?”, “Does it mention a refund policy?”) and get grounded answers with references to the relevant sections.

---

## 6. Technical Architecture

### 6.1 High‑Level Design

Two processing modes:

**Local mode (free):**
User → Static Web App → Local AI Model (0.5B, in‑browser) → Result

**Deep Analysis mode (premium):**
User → Static Web App → E2E Encrypt → Node.js Backend → Ollama (larger model) → Encrypt Response → User

---

### 6.2 Frontend Stack

* Framework: React 19 + Vite
* Language: TypeScript
* Styling: Tailwind CSS v4
* State: Zustand
* Build target: Static site

Optional later:

* PWA capabilities for offline usage

---

### 6.3 AI Runtime — Local Mode

Use Transformers.js (@huggingface/transformers)

* Model: `onnx-community/Qwen2.5-0.5B-Instruct` (q4 quantized)
* Embedding: `Xenova/all-MiniLM-L6-v2` (fp32)
* Runs in Web Workers (WASM with WebGPU fallback)
* Supports RAG via semantic search for long documents

---

### 6.4 AI Runtime — Deep Analysis Mode

Backend server calling Ollama for inference:

* Server: Node.js + Express + TypeScript (`server/` directory)
* Model server: Ollama
* Development model: `qwen2.5:3b` (runs on CPU, good for testing)
* Staging model: `qwen2.5:7b` (GPU required)
* Production model: TBD based on quality/cost evaluation (7B, 14B, or 72B)
* Context window: Configurable via `OLLAMA_CONTEXT_WINDOW` (default 32K tokens)

---

### 6.5 Model Strategy

| Tier | Model | Where | Context | Download |
|------|-------|-------|---------|----------|
| Free (Local) | Qwen 2.5 0.5B (q4) | Browser | 32K tokens | ~350MB |
| Premium (API) | Qwen 2.5 3B+ | Server/Ollama | 32K+ tokens | N/A (server) |
| Embedding | MiniLM-L6-v2 | Browser | N/A | ~25MB |

Selection criteria:

* Small to medium size for browser, larger for server
* Good quality for professional text
* Permissive license for commercial use
* ONNX compatibility (browser) / GGUF (Ollama)

---

### 6.6 Backend Architecture (`server/`)

```
server/
  src/
    index.ts              — Express server entry
    config.ts             — Environment config
    routes/
      analyze.ts          — POST /api/analyze
      chat.ts             — POST /api/chat
      session.ts          — POST /api/session/init (ECDH key exchange)
      health.ts           — GET /api/health
    services/
      llmService.ts       — Deep Analysis facade (ollama | runpod | openrouter + RunPod→OpenRouter fallback)
      ollamaService.ts    — Ollama HTTP client with streaming
      runpodService.ts    — RunPod OpenAI-compatible vLLM streaming
      openrouterService.ts — OpenRouter gateway with privacy provider routing
      openaiCompatibleStream.ts — Shared SSE helpers
      cryptoService.ts    — Server‑side ECDH + AES‑256‑GCM
    middleware/
      encryption.ts       — Decrypt request / encrypt response
      security.ts         — Helmet, CORS, rate limiting
      validation.ts       — Zod schema validation
    types/
      index.ts
```

Deep Analysis provider (`DEEP_ANALYSIS_LLM_PROVIDER`):

* `openrouter` — OpenRouter API (recommended default; allowlist `azure,novita,deepinfra`, `data_collection=deny`, ZDR when available)
* `runpod` — Self-hosted vLLM; falls back to OpenRouter if pods are down and `OPENROUTER_API_KEY` is set
* `ollama` — Local/dev

Zero‑persistence guarantees:
* No document/prompt database writes (usage metering is aggregate counts only)
* Request bodies never logged
* Session keys held in memory with TTL (default 30 min)
* Expired keys overwritten with zeros before deletion
* AI provider keys server-side only (never `NEXT_PUBLIC_*`)

---

### 6.7 End‑to‑End Encryption Protocol

1. Client generates ephemeral ECDH key pair (P‑256)
2. Client sends public key to `POST /api/session/init`
3. Server generates its own ephemeral ECDH key pair
4. Both derive the same shared secret via ECDH
5. Shared secret → HKDF (SHA‑256) → AES‑256‑GCM key
6. All request payloads encrypted with AES‑256‑GCM + random IV per message
7. Server decrypts, processes via the configured Deep Analysis provider (Ollama / RunPod / OpenRouter), encrypts response tokens
8. Response streamed back as encrypted SSE events
9. Client decrypts each chunk and renders tokens

---

### 6.8 File Handling

Supported inputs:

* Pasted text
* Uploaded files processed locally (PDF parsing in browser via PDF.js)
* Maximum file size: 50MB

Rules:

* Files are never uploaded in local mode
* In API mode, only extracted text (not raw files) is encrypted and sent
* Clear memory after session ends

Additional requirement (for chat with document):

* Maintain an in-memory representation of the current document (plain text + optional structure like headings/pages) to support grounded Q&A and evidence highlighting.

---

### 6.9 Performance Considerations

* Large first‑load download (model files) for local mode
* Cache model in browser storage (IndexedDB)
* Provide progress indicators
* Avoid blocking UI (use Web Workers)
* API mode has no client‑side model download overhead

---

## 7. UX Requirements

### 7.1 Privacy Signaling

Display clear indicators:

* "Processed locally — not uploaded"
* "Private mode"
* "Nothing is saved"

Provide a simple explanation modal:

> Your document is processed directly on your device. It is not sent to our servers and is not stored.

---

### 7.2 Core Interface

Main components:

1. Input area (paste or upload)
2. Task selector (summarize, explain, draft, etc.)
3. Run analysis button
4. Output panel
5. Privacy badge
6. **Chat with document panel**

   * Chat input + message history
   * Answers grounded in the provided document only
   * Show “evidence” by quoting short snippets and/or indicating section headings / page references (when available)
   * Allow follow-up questions that keep context within the current session

---

### 7.3 Error Handling

Gracefully handle:

* Unsupported browser
* Insufficient device memory
* Model load failures
* Large file limits

---

## 8. Hosting & Infrastructure

### Static Hosting Only

Recommended providers:

* Cloudflare Pages
* Vercel (static)
* Netlify
* GitHub Pages

Expected cost at beta scale: Near zero

---

## 9. Analytics Policy

Allowed:

* Page views
* Performance metrics
* Non‑content events

Forbidden:

* Capturing user text
* Session replay of inputs
* Logging document content

Use privacy‑focused analytics tools.

---

## 10. Security Considerations

### Transport & Network

* Enforce HTTPS (runtime warning if not on secure context)
* Strong Content Security Policy (CSP) with `base-uri 'self'` and `form-action 'self'`
* `Cross-Origin-Opener-Policy: same-origin` (Spectre memory isolation)
* `Cross-Origin-Embedder-Policy: require-corp`
* Expanded `Permissions-Policy`: camera, microphone, geolocation, payment, USB, bluetooth, serial, HID all blocked

### Client‑Side

* Per‑session AES‑256‑GCM encryption of document data in memory
* `autocomplete="off"` and `spellcheck="false"` on all document inputs
* Web Workers terminated on session end
* Encrypted buffers overwritten with random data before release
* 15‑minute idle timeout with auto‑clear
* No third‑party scripts that can access user input
* Prevent XSS vulnerabilities

### Server‑Side (Deep Analysis)

* Helmet security headers
* CORS restricted to configured origins
* Rate limiting on inference endpoints
* Request body validation via Zod schemas
* Zero body logging — only method, path, status, timing
* No persistent storage of any kind
* Session keys auto‑expire and are zeroed

Note: Client‑side processing reduces server risk but does not protect against compromised devices.

---

## 11. Cost Model (Beta)

Primary costs:

* Domain name
* Static hosting (minimal)
* Bandwidth for model downloads

Premium tier additional costs:

* GPU compute for Ollama model serving
* Backend hosting (Node.js server)

No costs for:

* Databases
* Storage

---

## 12. Future Roadmap (Post‑Beta)

### Phase 0.5 — Premium Deep Analysis (Current)

* Backend API with Ollama model serving
* End‑to‑end encrypted API calls (ECDH + AES‑256‑GCM)
* Account gating for premium features
* Larger models for higher quality analysis of long documents (200+ pages)

### Phase 1 — Local Persistence

* Encrypted save on device
* IndexedDB storage

### Phase 2 — Cloud Sync (Optional)

* End‑to‑end encrypted uploads
* Multi‑device access

### Phase 3 — Collaboration

* Secure sharing
* Team features
* Access control

### Phase 4 — Advanced Assistant

* Cross‑document reasoning
* Personal knowledge base
* Email and workflow integrations

---

## 13. Product Positioning

Category:
**Privacy‑First On‑Device AI Document Assistant**

Key differentiator:
AI that works without sending documents to the cloud.

---

## 14. Success Criteria for Beta

* Users can complete core tasks locally
* Performance acceptable on typical laptops
* Privacy claims remain accurate
* Infrastructure costs remain minimal
* Clear demand validation achieved

---

## 15. Non‑Goals for Beta

Do NOT implement yet:

* User accounts (premium tier will be open for testing, gated later)
* Billing
* Document storage
* Mobile optimization beyond basic support
* Enterprise compliance features

---

## 16. Development Guidelines for IDE / Agents

When generating code or features:

1. Prefer client‑side solutions for the free tier
2. Maintain privacy‑first constraints at all times
3. Never persist document data on the server — memory‑only processing
4. All API payloads must be end‑to‑end encrypted
5. Optimize for performance and bundle size
6. Use well‑maintained libraries
7. Ensure frontend compatibility with static hosting
8. Backend (`server/`) is Node.js + Express + TypeScript, calls Ollama for inference

### Running Locally

```bash
# Terminal 1: Start Ollama
ollama pull qwen2.5:3b
ollama serve

# Terminal 2: Start backend
cd server && npm run dev

# Terminal 3: Start frontend
npm run dev
```

---

## 17. Summary

The beta product is a privacy‑first AI web application with two tiers:

* **Free tier:** Document intelligence entirely on the user’s device with near‑zero operational cost.
* **Premium tier (Deep Analysis):** End‑to‑end encrypted backend API using a larger model via Ollama for higher quality analysis of long documents.

Both tiers guarantee that documents are never persisted — processed in memory only, cleared on session end. The focus is validation of value, trust, and usability — not scale or feature completeness.
