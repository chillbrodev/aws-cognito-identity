import type { CognitoAccessToken } from "./cognito_access_token.ts";
import type { CognitoIdToken } from "./cognito_id_token.ts";
import type { CognitoRefreshToken } from "./cognito_refresh_token.ts";

/** Session containing id, access, and refresh tokens; check {@link CognitoUserSession.isValid} before use. */
export class CognitoUserSession {
  invalidated = false;

  constructor(
    public idToken: CognitoIdToken,
    public accessToken: CognitoAccessToken,
    public refreshToken?: CognitoRefreshToken | null,
    public clockDrift?: number | null,
  ) {
    this.clockDrift = clockDrift ?? this.calculateClockDrift();
  }

  getIdToken(): CognitoIdToken {
    return this.idToken;
  }

  getRefreshToken(): CognitoRefreshToken | null | undefined {
    return this.refreshToken;
  }

  getAccessToken(): CognitoAccessToken {
    return this.accessToken;
  }

  getClockDrift(): number | null | undefined {
    return this.clockDrift;
  }

  calculateClockDrift(): number {
    const now = Math.floor(Date.now() / 1000);
    const iat = Math.min(
      this.accessToken.getIssuedAt(),
      this.idToken.getIssuedAt(),
    );
    return now - iat;
  }

  invalidateToken(): void {
    this.invalidated = true;
  }

  isValid(): boolean {
    if (this.invalidated) return false;
    const now = Math.floor(Date.now() / 1000);
    const adjusted = now - (this.clockDrift ?? 0);
    return (
      adjusted < this.accessToken.getExpiration() &&
      adjusted < this.idToken.getExpiration()
    );
  }
}
