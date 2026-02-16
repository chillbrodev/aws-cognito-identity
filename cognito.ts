/**
 * AWS Cognito Identity (User Pools) – Deno/TypeScript port.
 * @module
 */
export { AttributeArg } from "./src/attribute_arg.ts";
export type { AttributeArgLike } from "./src/attribute_arg.ts";
export { AuthenticationDetails } from "./src/authentication_details.ts";
export { Client } from "./src/client.ts";
export type { ClientOptions } from "./src/client.ts";
export { CognitoClientException } from "./src/cognito_client_exceptions.ts";
export { CognitoCredentials } from "./src/cognito_credentials.ts";
export { CognitoIdToken } from "./src/cognito_id_token.ts";
export { CognitoIdentityId } from "./src/cognito_identity_id.ts";
export { CognitoJwtToken } from "./src/cognito_jwt_token.ts";
export type { JwtPayload } from "./src/cognito_jwt_token.ts";
export { CognitoRefreshToken } from "./src/cognito_refresh_token.ts";
export type { CognitoStorage } from "./src/storage.ts";
export { CognitoMemoryStorage, CognitoStorageHelper } from "./src/storage.ts";
export { CognitoUserAttribute } from "./src/cognito_user_attribute.ts";
export {
  CognitoUserConfirmationNecessaryException,
  CognitoUserCustomChallengeException,
  CognitoUserDeviceConfirmationNecessaryException,
  CognitoUserEmailOtpRequiredException,
  CognitoUserException,
  CognitoUserMfaRequiredException,
  CognitoUserMfaSetupException,
  CognitoUserNewPasswordRequiredException,
  CognitoUserPhoneNumberVerificationNecessaryException,
  CognitoUserSelectMfaTypeException,
  CognitoUserTotpRequiredException,
} from "./src/cognito_user_exceptions.ts";
export { CognitoUserPool, CognitoUserPoolData } from "./src/cognito_user_pool.ts";
export { CognitoUserSession } from "./src/cognito_user_session.ts";
export {
  CognitoUser,
  imfaSettingsToMap,
} from "./src/cognito_user.ts";
export type { CognitoUserAuthResult, IMfaSettings } from "./src/cognito_user.ts";
export { CognitoAccessToken } from "./src/cognito_access_token.ts";
export { noOpsParamsDecorator } from "./src/params_decorators.ts";
export type { ParamsDecorator } from "./src/params_decorators.ts";
