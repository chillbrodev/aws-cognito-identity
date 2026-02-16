import { CognitoJwtToken } from "./cognito_jwt_token.ts";

export class CognitoAccessToken extends CognitoJwtToken {
  constructor(token: string | null) {
    super(token);
  }
}
