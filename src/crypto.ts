/**
 * Crypto utilities for SRP and SigV4: SHA-256, HMAC-SHA256, hex/base64.
 * Uses Web Crypto API (Deno/browser compatible).
 */

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hexStr: string): Uint8Array {
  const len = hexStr.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const buf = new Uint8Array(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}

/** Returns 64-char hex string (leading zeros padded). */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await sha256Bytes(data);
  return bytesToHex(hash).padStart(64, "0");
}

export async function hmacSha256(
  key: Uint8Array,
  message: Uint8Array,
): Promise<Uint8Array> {
  const keyBuf = new Uint8Array(key);
  const msgBuf = new Uint8Array(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBuf);
  return new Uint8Array(sig);
}

export async function hmacSha256Hex(
  key: Uint8Array,
  message: Uint8Array,
): Promise<string> {
  const out = await hmacSha256(key, message);
  return bytesToHex(out);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

export function utf8Encode(s: string): Uint8Array {
  return encoder.encode(s);
}

export function utf8Decode(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
