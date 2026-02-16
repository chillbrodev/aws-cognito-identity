import { base64Decode, utf8Decode } from "./crypto.ts";

export interface JwtPayload {
  sub?: string;
  token_use?: string;
  auth_time?: number;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export class CognitoJwtToken {
  payload: JwtPayload = {};

  constructor(public jwtToken: string | null) {
    this.payload = this.decodePayload();
  }

  getJwtToken(): string | null {
    return this.jwtToken;
  }

  getSub(): string | undefined {
    return this.payload.sub;
  }

  getTokenUse(): string | undefined {
    return this.payload.token_use;
  }

  getAuthTime(): number {
    return this.payload.auth_time ?? 0;
  }

  getIss(): string | undefined {
    return this.payload.iss;
  }

  getExpiration(): number {
    return this.payload.exp ?? 0;
  }

  getIssuedAt(): number {
    return this.payload.iat ?? 0;
  }

  decodePayload(): JwtPayload {
    if (!this.jwtToken) return {};
    const parts = this.jwtToken.split(".");
    if (parts.length < 2) return {};
    let payload = parts[1];
    const remainder = payload.length % 4;
    if (remainder > 0) {
      payload += "=".repeat(4 - remainder);
    }
    try {
      const decoded = base64Decode(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(utf8Decode(decoded)) as JwtPayload;
    } catch {
      return {};
    }
  }
}
