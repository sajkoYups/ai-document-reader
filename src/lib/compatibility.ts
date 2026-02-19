export interface CompatibilityCheck {
  wasm: boolean;
  sharedArrayBuffer: boolean;
  webWorker: boolean;
  allPassed: boolean;
  warnings: string[];
}

export function checkBrowserCompatibility(): CompatibilityCheck {
  const wasm = typeof WebAssembly !== "undefined";
  const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const webWorker = typeof Worker !== "undefined";

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

  return {
    wasm,
    sharedArrayBuffer,
    webWorker,
    allPassed: wasm && webWorker,
    warnings,
  };
}
