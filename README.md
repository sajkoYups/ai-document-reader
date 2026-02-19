# Private AI Doc Analyzer

A privacy-first AI document assistant that runs entirely in your browser. No accounts, no cloud processing, no file storage.

## Features

- **Document analysis** -- summarize, explain, extract key points, obligations, risks, and dates
- **Document generation** -- draft new documents from prompts
- **Chat with documents** -- ask questions and get grounded answers with evidence snippets
- **100% on-device** -- powered by Transformers.js with WASM inference
- **Privacy guaranteed** -- your files never leave your device

## Tech Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4
- Zustand (state management)
- Hugging Face Transformers.js (local AI inference via Web Workers)
- PDF.js (client-side PDF text extraction)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

The `dist/` folder contains a fully static site ready for deployment to Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

## Usage

1. **Paste text** or **upload a file** (PDF, TXT, Markdown)
2. Click **Load AI Model** (first time downloads ~200MB, cached afterward)
3. Select a **task** (Summarize, Explain, Extract, Draft, or Chat)
4. Click **Run** or press `Ctrl+Enter`

### Keyboard Shortcuts

| Shortcut      | Action     |
| ------------- | ---------- |
| `Ctrl+Enter`  | Run task   |
| `Escape`      | Clear all  |

## Privacy

All document processing happens locally in the browser via WebAssembly. Your files are never uploaded to any server. The only network requests are for:

- Loading the static web app
- Downloading the AI model (cached in IndexedDB)
- Loading web fonts

Closing the tab clears all session data.

## Project Structure

```
src/
  components/   -- UI components (Button, Card, Modal, ChatPanel, etc.)
  hooks/        -- Custom React hooks (useAiTask, useKeyboardShortcuts, etc.)
  lib/          -- Utilities (document parser, PDF extractor, AI pipeline, prompts)
  store/        -- Zustand stores (document, AI, chat)
  types/        -- TypeScript type definitions
  workers/      -- Web Worker for AI inference
```
