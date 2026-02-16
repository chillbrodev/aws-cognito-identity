import { CognitoJwtToken } from "./cognito_jwt_token.ts";

export class CognitoIdToken extends CognitoJwtToken {
  constructor(idToken: string | null) {
    super(idToken);
  }
}
