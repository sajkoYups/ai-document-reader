export interface CompatibilityCheck {
  wasm: boolean;
  sharedArrayBuffer: boolean;
  webWorker: boolean;
  webCrypto: boolean;
  allPassed: boolean;
  warnings: string[];
}

import { hasWebCryptoSupport } from "@/lib/cryptoSupport";

export function checkBrowserCompatibility(): CompatibilityCheck {
  const wasm = typeof WebAssembly !== "undefined";
  const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const webWorker = typeof Worker !== "undefined";
   const webCrypto = hasWebCryptoSupport();

  const warnings: string[] = [];

  if (!wasm) {
    warnings.push("WebAssembly is not supported. AI features will not work.");
  }
  if (!webWorker) {
    warnings.push("Web Workers are not supported. AI processing requires this feature.");
  }
  if (!sharedArrayBuffer) {
    warnings.push(
      "SharedArrayBuffer is not available. Some performance optimizations may be limited.",
    );
  }
  if (!webCrypto) {
    warnings.push(
      "Web Crypto API (crypto.subtle) is not available. Deep Analysis encryption requires a modern browser over HTTPS.",
    );
  }

  return {
    wasm,
    sharedArrayBuffer,
    webWorker,
    webCrypto,
    allPassed: wasm && webWorker && webCrypto,
    warnings,
  };
}
