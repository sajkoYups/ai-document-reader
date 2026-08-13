# Private AI Doc Analyzer (PIA)

A privacy-first AI document assistant with two processing modes:

- **Standard** — Transformers.js in the browser. Documents are not uploaded.
- **Deep Analysis** — Clerk-gated. The browser encrypts the request to the PIA API (ECDH + AES-256-GCM). The API decrypts in memory and sends plaintext over TLS to named privacy-constrained providers (OpenRouter / optional RunPod). PIA does not persist documents or prompts.

Details: [Trust Center](next-app/src/app/trust-center/page.tsx) (also `/trust-center` in the running app).

## Features

- Workflows: Summarize, Review, Extract, Compare, Timeline, Ask, and related analysis
- Grounded answers with evidence snippets
- Standard mode: on-device WASM / WebGPU inference
- Deep Analysis: larger hosted models behind application-layer encryption to the API

## Tech Stack

- Next.js (App Router) + React 19 + TypeScript (`next-app/`)
- Express + TypeScript API (`server/`)
- Tailwind CSS
- Zustand
- Hugging Face Transformers.js (local inference via Web Workers)
- PDF.js (client-side PDF text extraction)
- Clerk (Deep Analysis accounts)
- OpenRouter / RunPod / Ollama (Deep Analysis providers)

## Getting Started

```bash
# Frontend
cd next-app && npm install && npm run dev

# Backend (Deep Analysis)
cd server && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Privacy

**Standard:** parsing and inference run in the browser. Files are not uploaded. The open tab holds document text in memory (including sections and retrieval chunks) until idle timeout, refresh, or close.

**Deep Analysis:** payloads are encrypted to the PIA API. After decrypt, inference providers see plaintext for that request under their published policies. PIA logs metadata only (no document or completion bodies). Usage metering stores aggregate token estimates, not text.

The only other typical network requests are loading the app, downloading local model weights (cached), fonts, optional consent-gated analytics, and auth (Clerk).
