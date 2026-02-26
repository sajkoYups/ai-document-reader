// Minimal DOMMatrix polyfill for server-side builds.
// pdfjs-dist expects DOMMatrix to exist in some environments; on Node it does not.
// We only need a stub so that server bundling and prerendering don't crash.

if (
  typeof window === "undefined" &&
  typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix === "undefined"
) {
  class DummyDOMMatrix {
    // Accept any constructor args; implementation is intentionally empty.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._args: unknown[]) {}
  }

  (globalThis as { DOMMatrix?: typeof DummyDOMMatrix }).DOMMatrix = DummyDOMMatrix;
}

