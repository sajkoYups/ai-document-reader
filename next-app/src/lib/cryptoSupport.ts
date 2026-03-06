export function hasWebCryptoSupport(): boolean {
  if (typeof window === "undefined") return false;

  const cryptoObject = window.crypto;
  return !!cryptoObject && typeof cryptoObject.subtle !== "undefined";
}

