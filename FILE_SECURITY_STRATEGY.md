# File security strategy

PIA does not store uploaded files. A document is read in the browser, and only selected text — or, for scanned pages, rendered JPEG bytes — leaves the machine. That shape is why this project does not run ClamAV or Cloudmersive.

## Where bytes go

| Step | What happens | Stored? |
| --- | --- | --- |
| User selects a PDF, TXT, or MD file | The browser reads it. Client cap is 50 MB. | No. Browser memory only. |
| Text PDF | PDF.js extracts text, up to 300 pages, with `isEvalSupported: false`. | No. |
| Scanned PDF | The browser renders at most 20 pages to JPEG and sends those images to the API for Tesseract. | No. The server holds them in memory for that request, then drops them. |
| TXT / MD | Read as text in the browser. | No. |
| Standard mode | Embeddings and the Transformers.js worker run in the browser. | No server copy. |
| Deep Analysis | Selected text is encrypted (ECDH P-256, AES-256-GCM) and sent to the API. Express decrypts it in memory and sends the prompt to OpenRouter. | No document row. Neon stores waitlist ciphertext and token counts, and, once the schema is applied, entitlement and reservation rows. |
| Answer | Streamed back on the encrypted session and rendered as React text. | No document archive. |

There is no document table, no object storage, and no path that writes the upload to disk for later scanning.

## Why ClamAV is not used

ClamAV scans files that land on a server: uploads on disk, mail attachments, or a shared volume. This API never receives the original file as a stored object. The OCR path receives JPEG bytes, checks the JPEG start-of-image (`FF D8 FF`), runs Tesseract in memory, and times out a wedged page after 60 seconds. A signature scan of those images would not see the PDF, would not run on the text path at all, and would require keeping bytes the product is built not to keep.

The executable risk in a PDF is script inside the document. PDF.js is opened with `isEvalSupported: false` on both `getDocument` calls, so the extractor does not run document JavaScript. Text extraction also stops at 300 pages so a huge page tree cannot run without a bound. OCR stays at 20 pages.

Adding a malware service would send customer documents to another processor or keep them on a host. Both conflict with the local-privacy design. Cloudmersive was not added for the same reason.

## What still matters for files

- Type allowlist stays PDF, TXT, and MD. The client rejects other types before upload.
- The JSON body limit on the API is 55 MB, just above the 50 MB client cap, so a slightly larger encrypted body still fits and a much larger one does not.
- OCR rejects a body that is not a JPEG. Invalid images return 400 with a generic message. Other OCR failures return a generic 500. Workers that time out are terminated and removed from the in-process map.
- Session keys are bound to the Clerk user who created the session. Another user's session id does not decrypt the body.
- OCR, analyze, chat, and session init are rate-limited per Clerk user id. OCR does not spend hosted tokens. It can still burn CPU, which is why it has its own limiter and a page timeout.
- Document text is untrusted data in the user turn, not instructions in the system prompt. That limits prompt injection to the model's answer. The answer is rendered as text, so it is not stored XSS.
- Hosted context for structured workflows stays at the existing 10,000-character application cap. This work did not raise it. A larger cap would send more text to OpenRouter and change answers. It needs its own decision.

## What this does not claim

The browser can still be given a hostile PDF. `isEvalSupported: false` turns off PDF JavaScript in PDF.js. It is not a full sandbox of every PDF feature, and it does not scan for exploits in the decoder. The server never executes the upload as a program. Tesseract sees JPEG bytes after the signature check, which is a format gate, not a claim that every JPEG is safe to decode.

If a later feature writes files to disk, stores them in Neon, or forwards the original bytes to a third party, this decision should be reopened. Until then, scanning belongs on a system that actually holds the file.
