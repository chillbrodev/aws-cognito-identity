const HEX_CHARS = "0123456789abcdef";

/**
 * Generate a cryptographically random hex string of given length.
 */
export function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    out += HEX_CHARS[bytes[i] >> 4];
    if (out.length < length) out += HEX_CHARS[bytes[i] & 0x0f];
  }
  return out;
}
