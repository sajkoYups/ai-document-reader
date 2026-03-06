/**
 * Detect if the current environment is likely a mobile device.
 * Used to enforce API-only mode on mobile (no local model download).
 */
export function isLikelyMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua) ||
    navigator.maxTouchPoints > 1
  );
}
