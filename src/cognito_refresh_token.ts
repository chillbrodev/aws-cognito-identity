export class CognitoRefreshToken {
  constructor(public token: string | null = "") {}

  getToken(): string | null {
    return this.token;
  }
}
