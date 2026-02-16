import { CognitoJwtToken } from "./cognito_jwt_token.ts";

/** Cognito ID token (identity, sub); use for API Gateway/AppSync auth. */
export class CognitoIdToken extends CognitoJwtToken {
  constructor(idToken: string | null) {
    super(idToken);
  }
}
