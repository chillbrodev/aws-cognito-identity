/** Cognito refresh token used to obtain new id/access tokens. */
export class CognitoRefreshToken {
  constructor(public token: string | null = "") {}

  getToken(): string | null {
    return this.token;
  }
}
