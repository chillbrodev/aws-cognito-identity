import { CognitoJwtToken } from "./cognito_jwt_token.ts";

/** Cognito access token (scope, resource access). */
export class CognitoAccessToken extends CognitoJwtToken {
  constructor(token: string | null) {
    super(token);
  }
}
