import type { AttributeArg } from "./attribute_arg.ts";

/** Credentials and optional validation data for sign-in (used with {@link CognitoUser.authenticateUser}). */
export class AuthenticationDetails {
  constructor(
    public username?: string | null,
    public password?: string | null,
    public validationData?: Record<string, string> | null,
    public authParameters?: AttributeArg[] | null,
  ) {}

  getUsername(): string | null | undefined {
    return this.username;
  }

  getPassword(): string | null | undefined {
    return this.password;
  }

  getValidationData(): Record<string, string> | null | undefined {
    return this.validationData;
  }

  getAuthParameters(): AttributeArg[] | null | undefined {
    return this.authParameters;
  }
}
