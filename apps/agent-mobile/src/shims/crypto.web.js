// ============================================================
// VoteCapsule™ — Web shim for Node `crypto` built-in
// apps/agent-mobile/src/shims/crypto.web.js
//
// The deprecated `crypto@1.0.1` npm stub (pulled in by
// services/identity) has no actual index.js, which causes
// Metro to crash when bundling for web.
//
// On web, expo-modules-core's uuid.web.js only uses
// `crypto.getRandomValues()` which is natively available
// on every modern browser via `globalThis.crypto`.
// This shim re-exports the browser WebCrypto API so Metro
// has a valid module to resolve while the browser runtime
// provides the real implementation.
// ============================================================

// Browser WebCrypto — available in all modern browsers and
// in Node 19+ as globalThis.crypto (Web Crypto API).
const webCrypto =
  typeof globalThis !== 'undefined' && globalThis.crypto
    ? globalThis.crypto
    : typeof window !== 'undefined' && window.crypto
    ? window.crypto
    : {};

export const getRandomValues = webCrypto.getRandomValues
  ? (arr) => webCrypto.getRandomValues(arr)
  : (arr) => arr; // no-op fallback — uuid degrades gracefully

export const subtle = webCrypto.subtle ?? {};

export const randomUUID = webCrypto.randomUUID
  ? () => webCrypto.randomUUID()
  : undefined;

export default webCrypto;
