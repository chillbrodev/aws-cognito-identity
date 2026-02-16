/**
 * CognitoUser - main auth API (sign in, challenges, MFA, attributes, etc.)
 * Ported from amazon-cognito-identity-dart-2.
 */
import { base64Decode, base64Encode, hmacSha256, hexToBytes, utf8Encode } from "./crypto.ts";
import { AttributeArg } from "./attribute_arg.ts";
import { AuthenticationDetails } from "./authentication_details.ts";
import { AuthenticationHelper } from "./authentication_helper.ts";
import { Client } from "./client.ts";
import { CognitoAccessToken } from "./cognito_access_token.ts";
import { CognitoClientException } from "./cognito_client_exceptions.ts";
import { CognitoIdToken } from "./cognito_id_token.ts";
import { CognitoRefreshToken } from "./cognito_refresh_token.ts";
import type { CognitoStorage } from "./storage.ts";
import { CognitoUserAttribute } from "./cognito_user_attribute.ts";
import {
  CognitoUserConfirmationNecessaryException,
  CognitoUserCustomChallengeException,
  CognitoUserDeviceConfirmationNecessaryException,
  CognitoUserEmailOtpRequiredException,
  CognitoUserMfaRequiredException,
  CognitoUserMfaSetupException,
  CognitoUserNewPasswordRequiredException,
  CognitoUserPhoneNumberVerificationNecessaryException,
  CognitoUserSelectMfaTypeException,
  CognitoUserTotpRequiredException,
} from "./cognito_user_exceptions.ts";
import type { CognitoUserPool } from "./cognito_user_pool.ts";
import { CognitoUserSession } from "./cognito_user_session.ts";
import { getNowString } from "./date_helper.ts";
import type { ParamsDecorator } from "./params_decorators.ts";
import { noOpsParamsDecorator } from "./params_decorators.ts";

export interface CognitoUserAuthResult {
  challengeName?: string | null;
  session?: string | null;
  authenticationResult?: unknown;
}

export interface IMfaSettings {
  preferredMfa: boolean;
  enabled: boolean;
}

export function imfaSettingsToMap(s: IMfaSettings): Record<string, boolean> {
  return { PreferredMfa: s.preferredMfa, Enabled: s.enabled };
}

/** Keys that must never be sent in AuthParameters or ClientMetadata (SRP keeps password off the wire). */
const SENSITIVE_KEYS = new Set(["password", "PASSWORD", "Password", "secret", "SECRET"]);

/** Strip password-like keys from objects sent as ClientMetadata/validationData so they never appear in network logs. */
export function sanitizeForRequest(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (obj == null || typeof obj !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export class CognitoUser {
  private _deviceKey: string | null = null;
  private _randomPassword: string | null = null;
  private _deviceGroupKey: string | null = null;
  private _session: string | null = null;
  private _signInUserSession: CognitoUserSession | null = null;
  private _clientSecretHash: string | null = null;
  private _analyticsMetadataParamsDecorator: ParamsDecorator;
  private _client: Client | null;
  private _authenticationFlowType: string;
  deviceName: string;
  verifierDevices: string | null = null;
  storage!: CognitoStorage;

  constructor(
    public username: string | null,
    public pool: CognitoUserPool,
    opts?: {
      clientSecretHash?: string | null;
      storage?: CognitoStorage | null;
      deviceName?: string;
      signInUserSession?: CognitoUserSession | null;
      analyticsMetadataParamsDecorator?: ParamsDecorator | null;
    },
  ) {
    this.deviceName = opts?.deviceName ?? "Deno-device";
    this._analyticsMetadataParamsDecorator = opts?.analyticsMetadataParamsDecorator ?? noOpsParamsDecorator;

    if (opts?.clientSecretHash != null) {
      this._clientSecretHash = opts.clientSecretHash;
    }
    if (opts?.signInUserSession != null) this._signInUserSession = opts.signInUserSession;

    this._client = pool.client;
    this._authenticationFlowType = "USER_SRP_AUTH";

    this.storage = opts?.storage ?? pool.storage;
    pool.storage = this.storage;
  }

  get client(): Client | null {
    return this._client;
  }

  get authenticationFlowType(): string {
    return this._authenticationFlowType;
  }

  set authenticationFlowType(v: string) {
    this._authenticationFlowType = v;
  }

  get keyPrefix(): string {
    return `CognitoIdentityServiceProvider.${this.pool.getClientId()}.${this.username}`;
  }

  static async calculateClientSecretHash(
    userName: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const key = utf8Encode(clientSecret);
    const msg = utf8Encode(userName + clientId);
    const digest = await hmacSha256(key, msg);
    return base64Encode(digest);
  }

  private _signInUserSessionCheck(): void {
    if (this._signInUserSession == null || !this._signInUserSession.isValid()) {
      throw new Error("User is not authenticated");
    }
  }

  getCognitoUserSession(authResult: Record<string, unknown>): CognitoUserSession {
    const idToken = new CognitoIdToken(authResult["IdToken"] as string);
    const accessToken = new CognitoAccessToken(authResult["AccessToken"] as string);
    const refreshToken = new CognitoRefreshToken(authResult["RefreshToken"] as string | null);
    return new CognitoUserSession(idToken, accessToken, refreshToken);
  }

  async getSession(): Promise<CognitoUserSession | null> {
    if (this.username == null) throw new Error("Username is null. Cannot retrieve a new session");
    if (this._signInUserSession != null && this._signInUserSession.isValid()) {
      return this._signInUserSession;
    }
    const refreshTokenKey = `${this.keyPrefix}.refreshToken`;
    const clockDriftKey = `${this.keyPrefix}.clockDrift`;
    const idTokenKey = `${this.keyPrefix}.idToken`;
    const accessTokenKey = `${this.keyPrefix}.accessToken`;

    const refreshTokenValue = await this.storage.getItem(refreshTokenKey);
    const refreshToken = new CognitoRefreshToken(refreshTokenValue as string | null);
    const canRefreshToken = refreshToken.getToken() != null;

    const clockDriftValue = await this.storage.getItem(clockDriftKey);
    const clockDrift = typeof clockDriftValue === "string" ? parseInt(clockDriftValue, 10) : null;

    const idTokenValue = await this.storage.getItem(idTokenKey);
    if (idTokenValue == null) {
      if (canRefreshToken) return this.refreshSession(refreshToken);
      throw new Error("Local storage is missing an ID Token, Please authenticate");
    }
    const idToken = new CognitoIdToken(idTokenValue as string);
    const accessTokenValue = await this.storage.getItem(accessTokenKey);
    if (accessTokenValue == null) {
      if (canRefreshToken) return this.refreshSession(refreshToken);
      throw new Error("Local storage is missing an Access Token, Please authenticate");
    }
    const accessToken = new CognitoAccessToken(accessTokenValue as string);
    const cachedSession = new CognitoUserSession(idToken, accessToken, refreshToken, clockDrift ?? undefined);
    if (cachedSession.isValid()) {
      this._signInUserSession = cachedSession;
      return this._signInUserSession;
    }
    if (canRefreshToken) return this.refreshSession(refreshToken);
    throw new Error("Cannot retrieve a new session. Please authenticate.");
  }

  getSignInUserSession(): CognitoUserSession | null {
    return this._signInUserSession;
  }

  getUsername(): string | null {
    return this.username;
  }

  async getDeviceKey(): Promise<string | null> {
    if (this._deviceKey != null) return this._deviceKey;
    await this.getCachedDeviceKeyAndPassword();
    return this._deviceKey;
  }

  setAuthenticationFlowType(flow: string): void {
    this._authenticationFlowType = flow;
  }

  getUserContextData(): string | null {
    return this.pool.getUserContextData(this.username);
  }

  async getCachedDeviceKeyAndPassword(): Promise<void> {
    const deviceKeyKey = `${this.keyPrefix}.deviceKey`;
    const randomPasswordKey = `${this.keyPrefix}.randomPasswordKey`;
    const deviceGroupKeyKey = `${this.keyPrefix}.deviceGroupKey`;
    const dk = await this.storage.getItem(deviceKeyKey);
    if (dk != null) {
      this._deviceKey = dk as string;
      this._deviceGroupKey = (await this.storage.getItem(deviceGroupKeyKey)) as string | null;
      this._randomPassword = (await this.storage.getItem(randomPasswordKey)) as string | null;
    }
  }

  async cacheTokens(): Promise<void> {
    const idTokenKey = `${this.keyPrefix}.idToken`;
    const accessTokenKey = `${this.keyPrefix}.accessToken`;
    const refreshTokenKey = `${this.keyPrefix}.refreshToken`;
    const clockDriftKey = `${this.keyPrefix}.clockDrift`;
    await this.storage.setItem(idTokenKey, this._signInUserSession?.getIdToken().getJwtToken());
    await this.storage.setItem(accessTokenKey, this._signInUserSession?.getAccessToken().getJwtToken());
    await this.storage.setItem(refreshTokenKey, this._signInUserSession?.getRefreshToken()?.getToken());
    await this.storage.setItem(clockDriftKey, String(this._signInUserSession?.getClockDrift() ?? ""));
    await this.storage.setItem(this.pool.lastUserKey, this.username);
  }

  async clearCachedTokens(): Promise<void> {
    const keys = [
      `${this.keyPrefix}.idToken`,
      `${this.keyPrefix}.accessToken`,
      `${this.keyPrefix}.refreshToken`,
      `${this.keyPrefix}.clockDrift`,
      this.pool.lastUserKey,
    ];
    await Promise.all(keys.map((k) => this.storage.removeItem(k)));
  }

  async cacheDeviceKeyAndPassword(): Promise<void> {
    await this.storage.setItem(`${this.keyPrefix}.deviceKey`, this._deviceKey);
    await this.storage.setItem(`${this.keyPrefix}.randomPasswordKey`, this._randomPassword);
    await this.storage.setItem(`${this.keyPrefix}.deviceGroupKey`, this._deviceGroupKey);
  }

  async clearCachedDeviceKeyAndPassword(): Promise<void> {
    await Promise.all([
      this.storage.removeItem(`${this.keyPrefix}.deviceKey`),
      this.storage.removeItem(`${this.keyPrefix}.randomPasswordKey`),
      this.storage.removeItem(`${this.keyPrefix}.deviceGroupKey`),
    ]);
  }

  async _authenticateUserInternal(
    dataAuthenticate: Record<string, unknown>,
    authenticationHelper: AuthenticationHelper,
  ): Promise<CognitoUserSession | null> {
    const challengeName = dataAuthenticate["ChallengeName"] as string | undefined;
    const challengeParameters = dataAuthenticate["ChallengeParameters"] as Record<string, unknown> | undefined;

    if (challengeName === "SMS_MFA") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserMfaRequiredException("SMS_MFA", challengeParameters);
    }
    if (challengeName === "SELECT_MFA_TYPE") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserSelectMfaTypeException("SELECT_MFA_TYPE", challengeParameters);
    }
    if (challengeName === "MFA_SETUP") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserMfaSetupException("MFA_SETUP", challengeParameters);
    }
    if (challengeName === "SOFTWARE_TOKEN_MFA") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserTotpRequiredException("SOFTWARE_TOKEN_MFA", challengeParameters);
    }
    if (challengeName === "EMAIL_OTP") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserEmailOtpRequiredException("EMAIL_OTP", challengeParameters);
    }
    if (challengeName === "CUSTOM_CHALLENGE") {
      this._session = dataAuthenticate["Session"] as string;
      throw new CognitoUserCustomChallengeException("CUSTOM_CHALLENGE", challengeParameters);
    }
    if (challengeName === "NEW_PASSWORD_REQUIRED") {
      this._session = dataAuthenticate["Session"] as string;
      let userAttributes: Record<string, unknown> | undefined;
      let requiredAttributes: string[] | undefined;
      if (challengeParameters?.["userAttributes"] != null) {
        userAttributes = JSON.parse(challengeParameters["userAttributes"] as string);
        requiredAttributes = JSON.parse(challengeParameters["requiredAttributes"] as string);
      }
      throw new CognitoUserNewPasswordRequiredException(userAttributes, requiredAttributes);
    }
    if (challengeName === "DEVICE_SRP_AUTH") {
      const session = await this.getDeviceResponse();
      return session;
    }

    const authResult = dataAuthenticate["AuthenticationResult"] as Record<string, unknown>;
    this._signInUserSession = this.getCognitoUserSession(authResult);
    await this.cacheTokens();

    const newDeviceMetadata = authResult["NewDeviceMetadata"] as Record<string, unknown> | undefined;
    if (newDeviceMetadata == null) return this._signInUserSession;

    await authenticationHelper.generateHashDevice(
      newDeviceMetadata["DeviceGroupKey"] as string,
      newDeviceMetadata["DeviceKey"] as string,
    );
    const saltB64 = base64Encode(hexToBytes(authenticationHelper.getSaltDevices()!));
    const verifierB64 = base64Encode(hexToBytes(authenticationHelper.getVerifierDevices()!));
    const deviceSecretVerifierConfig = { Salt: saltB64, PasswordVerifier: verifierB64 };
    this.verifierDevices = verifierB64;
    this._deviceGroupKey = newDeviceMetadata["DeviceGroupKey"] as string;
    this._randomPassword = authenticationHelper.getRandomPassword();

    const paramsConfirmDevice = {
      DeviceKey: newDeviceMetadata["DeviceKey"],
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
      DeviceSecretVerifierConfig: deviceSecretVerifierConfig,
      DeviceName: this.deviceName,
    };
    const dataConfirm = (await this.client!.request("ConfirmDevice", paramsConfirmDevice)) as Record<string, unknown>;
    this._deviceKey = newDeviceMetadata["DeviceKey"] as string;
    await this.cacheDeviceKeyAndPassword();
    if (dataConfirm["UserConfirmationNecessary"] === true) {
      throw new CognitoUserConfirmationNecessaryException(this._signInUserSession);
    }
    return this._signInUserSession;
  }

  async getDeviceResponse(): Promise<CognitoUserSession | null> {
    const authenticationHelper = await AuthenticationHelper.create(this._deviceGroupKey);
    const authParameters: Record<string, string> = {
      USERNAME: this.username!,
      DEVICE_KEY: this._deviceKey!,
      SRP_A: authenticationHelper.getLargeAValue().toString(16),
    };
    if (this._clientSecretHash != null) authParameters["SECRET_HASH"] = this._clientSecretHash;

    const params = {
      ChallengeName: "DEVICE_SRP_AUTH",
      ClientId: this.pool.getClientId(),
      ChallengeResponses: authParameters,
    };
    let userContextData = this.getUserContextData();
    if (userContextData != null) (params as Record<string, unknown>)["UserContextData"] = userContextData;

    const data = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(params as Record<string, unknown>))) as Record<string, unknown>;
    const challengeParameters = data["ChallengeParameters"] as Record<string, string>;
    const serverBValue = BigInt("0x" + challengeParameters["SRP_B"]);
    const saltString = authenticationHelper.toUnsignedHex(challengeParameters["SALT"]);
    const salt = BigInt("0x" + saltString);

    const hkdf = await authenticationHelper.getPasswordAuthenticationKey(this._deviceKey, this._randomPassword, serverBValue, salt);
    const dateNow = getNowString();
    const signatureData = new Uint8Array([
      ...utf8Encode(this._deviceGroupKey!),
      ...utf8Encode(this._deviceKey!),
      ...base64Decode(challengeParameters["SECRET_BLOCK"]),
      ...utf8Encode(dateNow),
    ]);
    const sig = await hmacSha256(hkdf, signatureData);
    const signatureString = base64Encode(sig);

    const challengeResponses: Record<string, string> = {
      USERNAME: this.username!,
      PASSWORD_CLAIM_SECRET_BLOCK: challengeParameters["SECRET_BLOCK"],
      TIMESTAMP: dateNow,
      PASSWORD_CLAIM_SIGNATURE: signatureString,
      DEVICE_KEY: this._deviceKey!,
    };
    if (this._clientSecretHash != null) challengeResponses["SECRET_HASH"] = this._clientSecretHash;

    const paramsResp = {
      ChallengeName: "DEVICE_PASSWORD_VERIFIER",
      ClientId: this.pool.getClientId(),
      ChallengeResponses: challengeResponses,
      Session: data["Session"],
    };
    if (this.getUserContextData() != null) (paramsResp as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    const dataAuthenticate = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(paramsResp))) as Record<string, unknown>;
    this._signInUserSession = this.getCognitoUserSession(dataAuthenticate["AuthenticationResult"] as Record<string, unknown>);
    await this.cacheTokens();
    return this._signInUserSession;
  }

  async authenticateUser(authDetails: AuthenticationDetails): Promise<CognitoUserSession | null> {
    if (this.authenticationFlowType === "USER_SRP_AUTH" || this.authenticationFlowType === "CUSTOM_AUTH") {
      return this._authenticateUserDefaultAuth(authDetails);
    }
    throw new Error("Authentication flow type is not supported.");
  }

  async signOut(opts?: { revokeRefreshToken?: boolean }): Promise<void> {
    if (opts?.revokeRefreshToken && this._signInUserSession != null && this._signInUserSession.getRefreshToken() != null) {
      const paramsReq: Record<string, unknown> = {
        ClientId: this.pool.getClientId(),
        Token: this._signInUserSession.getRefreshToken()!.getToken(),
      };
      const secret = this.pool.getClientSecret();
      if (secret != null) paramsReq["ClientSecret"] = secret;
      await this.client!.request("RevokeToken", paramsReq);
    }
    this._signInUserSession = null;
    await this.clearCachedTokens();
  }

  async globalSignOut(): Promise<void> {
    this._signInUserSessionCheck();
    await this.client!.request("GlobalSignOut", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    });
    await this.clearCachedTokens();
  }

  async _authenticateUserPlainUsernamePassword(authDetails: AuthenticationDetails): Promise<CognitoUserSession | null> {
    const authParameters: Record<string, string> = {
      USERNAME: this.username!,
      PASSWORD: authDetails.getPassword()!,
    };
    if (this._clientSecretHash != null && this._clientSecretHash !== "") authParameters["SECRET_HASH"] = this._clientSecretHash;
    if (authParameters["PASSWORD"] == null) throw new Error("PASSWORD parameter is required");

    const authenticationHelper = await AuthenticationHelper.create(this.pool.getUserPoolId().split("_")[1]);
    await this.getCachedDeviceKeyAndPassword();
    if (this._deviceKey != null) authParameters["DEVICE_KEY"] = this._deviceKey;

    const paramsReq = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.pool.getClientId(),
      AuthParameters: authParameters,
      ClientMetadata: sanitizeForRequest(authDetails.getValidationData() as Record<string, unknown> | undefined),
    };
    if (this.getUserContextData() != null) (paramsReq as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    const authResult = (await this.client!.request("InitiateAuth", await this._analyticsMetadataParamsDecorator(paramsReq))) as Record<string, unknown>;
    return this._authenticateUserInternal(authResult, authenticationHelper);
  }

  async _authenticateUserDefaultAuth(authDetails: AuthenticationDetails): Promise<CognitoUserSession | null> {
    const authenticationHelper = await AuthenticationHelper.create(this.pool.getUserPoolId().split("_")[1]);
    const dateHelper = getNowString;

    const authParameters: Record<string, string> = { USERNAME: this.username! };
    await this.getCachedDeviceKeyAndPassword();
    if (this._deviceKey != null) authParameters["DEVICE_KEY"] = this._deviceKey;

    const srpA = authenticationHelper.getLargeAValue();
    authParameters["SRP_A"] = srpA.toString(16);
    if (this.authenticationFlowType === "CUSTOM_AUTH") authParameters["CHALLENGE_NAME"] = "SRP_A";
    if (this._clientSecretHash != null) authParameters["SECRET_HASH"] = this._clientSecretHash;

    const params: Record<string, unknown> = {
      AuthFlow: this.authenticationFlowType,
      ClientId: this.pool.getClientId(),
      AuthParameters: authParameters,
      ClientMetadata: sanitizeForRequest(authDetails.getValidationData() as Record<string, unknown> | undefined),
    };
    if (this.getUserContextData() != null) params["UserContextData"] = this.getUserContextData();

    let data: Record<string, unknown>;
    try {
      data = (await this.client!.request("InitiateAuth", await this._analyticsMetadataParamsDecorator(params))) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof CognitoClientException && e.name === "UserNotConfirmedException") {
        throw new CognitoUserConfirmationNecessaryException();
      }
      throw e;
    }

    if (
      data["ChallengeName"] === "PASSWORD_VERIFIER" &&
      (data["Session"] == null || data["Session"] === "")
    ) {
      throw new Error(
        "Cognito did not return Session. For USER_SRP_AUTH, call InitiateAuth and RespondToAuthChallenge from the client (browser or app), not from a server. See docs/srp-client-vs-server.md",
      );
    }

    const challengeParameters = data["ChallengeParameters"] as Record<string, string>;
    const cp = (k: string, alt?: string) =>
      (challengeParameters[k] ?? (alt != null ? challengeParameters[alt] : undefined)) ?? "";
    let srpUsername = cp("USER_ID_FOR_SRP", "user_id_for_srp");
    if (this.username !== srpUsername) this.username = srpUsername;

    const serverBValue = BigInt("0x" + cp("SRP_B", "srp_b"));
    const saltString = authenticationHelper.toUnsignedHex(cp("SALT", "salt"));
    const salt = BigInt("0x" + saltString);

    const hkdf = await authenticationHelper.getPasswordAuthenticationKey(
      srpUsername,
      authDetails.getPassword() ?? null,
      serverBValue,
      salt,
    );
    const dateNow = dateHelper();

    const secretBlock = cp("SECRET_BLOCK", "secret_block");
    const signatureData = new Uint8Array([
      ...utf8Encode(this.pool.getUserPoolId().split("_")[1]),
      ...utf8Encode(srpUsername),
      ...base64Decode(secretBlock),
      ...utf8Encode(dateNow),
    ]);
    const sig = await hmacSha256(hkdf, signatureData);
    const signatureString = base64Encode(sig);

    const challengeResponses: Record<string, string> = {
      USERNAME: srpUsername,
      PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
      TIMESTAMP: dateNow,
      PASSWORD_CLAIM_SIGNATURE: signatureString,
    };
    if (this._deviceKey != null) challengeResponses["DEVICE_KEY"] = this._deviceKey;
    const clientSecret = this.pool.getClientSecret();
    if (this._clientSecretHash != null && clientSecret != null && this.pool.getClientId() != null) {
      this._clientSecretHash = await CognitoUser.calculateClientSecretHash(srpUsername, this.pool.getClientId()!, clientSecret);
      challengeResponses["SECRET_HASH"] = this._clientSecretHash;
    }

    const jsonReqResp: Record<string, unknown> = {
      ChallengeName: "PASSWORD_VERIFIER",
      ClientId: this.pool.getClientId(),
      ChallengeResponses: challengeResponses,
      Session: data["Session"],
      ClientMetadata: sanitizeForRequest(authDetails.getValidationData() as Record<string, unknown> | undefined),
    };
    if (this.getUserContextData() != null) jsonReqResp["UserContextData"] = this.getUserContextData();

    const dataAuthenticate = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(jsonReqResp))) as Record<string, unknown>;
    const challengeName = dataAuthenticate["ChallengeName"];

    if (challengeName === "NEW_PASSWORD_REQUIRED") {
      this._session = dataAuthenticate["Session"] as string;
      const cp = dataAuthenticate["ChallengeParameters"] as Record<string, string> | undefined;
      let userAttributes: Record<string, unknown> | undefined;
      let requiredAttributes: string[] = [];
      const prefix = authenticationHelper.getNewPasswordRequiredChallengeUserAttributePrefix();
      if (cp != null) {
        userAttributes = JSON.parse(cp["userAttributes"] ?? "{}");
        const raw = JSON.parse(cp["requiredAttributes"] ?? "[]") as string[];
        requiredAttributes = raw.map((a) => a.substring(prefix.length));
      }
      throw new CognitoUserNewPasswordRequiredException(userAttributes, requiredAttributes);
    }
    return this._authenticateUserInternal(dataAuthenticate, authenticationHelper);
  }

  async refreshSession(refreshToken: CognitoRefreshToken): Promise<CognitoUserSession | null> {
    const authParameters: Record<string, string> = { REFRESH_TOKEN: refreshToken.getToken()! };
    if ((await this.storage.getItem(this.pool.lastUserKey)) != null) {
      this.username = (await this.storage.getItem(this.pool.lastUserKey)) as string;
      this._deviceKey = (await this.storage.getItem(`${this.keyPrefix}.deviceKey`)) as string | null;
      authParameters["DEVICE_KEY"] = this._deviceKey ?? "";
    }
    if (this.pool.getClientSecret() != null) authParameters["SECRET_HASH"] = this.pool.getClientSecret()!;

    const paramsReq = {
      ClientId: this.pool.getClientId(),
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: authParameters,
    };
    if (this.getUserContextData() != null) (paramsReq as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    try {
      const authResult = (await this.client!.request("InitiateAuth", await this._analyticsMetadataParamsDecorator(paramsReq))) as Record<string, unknown>;
      const authenticationResult = authResult["AuthenticationResult"] as Record<string, unknown>;
      if (authenticationResult["RefreshToken"] == null) authenticationResult["RefreshToken"] = refreshToken.getToken();
      this._signInUserSession = this.getCognitoUserSession(authenticationResult);
      await this.cacheTokens();
      return this._signInUserSession;
    } catch (e) {
      if (e instanceof CognitoClientException && e.code === "NotAuthorizedException") {
        await this.clearCachedTokens();
      }
      throw e;
    }
  }

  async confirmRegistration(
    confirmationCode: string,
    opts?: { forceAliasCreation?: boolean; clientMetadata?: Record<string, string> | null },
  ): Promise<boolean> {
    const params: Record<string, unknown> = {
      ClientId: this.pool.getClientId(),
      ConfirmationCode: confirmationCode,
      Username: this.username,
      ForceAliasCreation: opts?.forceAliasCreation ?? false,
      ClientMetadata: sanitizeForRequest(opts?.clientMetadata as Record<string, unknown> | undefined),
    };
    if (this.getUserContextData() != null) params["UserContextData"] = this.getUserContextData();
    if (this._clientSecretHash != null) params["SecretHash"] = this._clientSecretHash;
    await this.client!.request("ConfirmSignUp", await this._analyticsMetadataParamsDecorator(params));
    return true;
  }

  async resendConfirmationCode(): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = { ClientId: this.pool.getClientId(), Username: this.username };
    if (this._clientSecretHash != null) params["SecretHash"] = this._clientSecretHash;
    return (await this.client!.request("ResendConfirmationCode", await this._analyticsMetadataParamsDecorator(params))) as Record<string, unknown>;
  }

  async sendCustomChallengeAnswer(answerChallenge: string, validationData?: Record<string, string> | null): Promise<CognitoUserSession | null> {
    const authenticationHelper = await AuthenticationHelper.create(this.pool.getUserPoolId().split("_")[1]);
    const challengeResponses: Record<string, string> = { USERNAME: this.username!, ANSWER: answerChallenge };
    await this.getCachedDeviceKeyAndPassword();
    if (this._deviceKey != null) challengeResponses["DEVICE_KEY"] = this._deviceKey;
    if (this._clientSecretHash != null) challengeResponses["SECRET_HASH"] = this._clientSecretHash;

    const paramsReq = {
      ChallengeName: "CUSTOM_CHALLENGE",
      ChallengeResponses: challengeResponses,
      ClientId: this.pool.getClientId(),
      ClientMetadata: sanitizeForRequest(validationData as Record<string, unknown> | undefined),
      Session: this._session,
    };
    if (this.getUserContextData() != null) (paramsReq as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    const data = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(paramsReq as Record<string, unknown>))) as Record<string, unknown>;
    return this._authenticateUserInternal(data, authenticationHelper);
  }

  async sendNewPasswordRequiredAnswer(newPassword: string, requiredAttributes?: Record<string, string> | null): Promise<CognitoUserSession | null> {
    const challengeResponses: Record<string, string> = { USERNAME: this.username!, NEW_PASSWORD: newPassword };
    if (requiredAttributes != null && Object.keys(requiredAttributes).length > 0) {
      for (const [k, v] of Object.entries(requiredAttributes)) {
        challengeResponses[`userAttributes.${k}`] = v;
      }
    }
    await this.getCachedDeviceKeyAndPassword();
    if (this._deviceKey != null) challengeResponses["DEVICE_KEY"] = this._deviceKey;
    if (this._clientSecretHash != null) challengeResponses["SECRET_HASH"] = this._clientSecretHash;

    const paramsReq = {
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ChallengeResponses: challengeResponses,
      ClientId: this.pool.getClientId(),
      Session: this._session,
    };
    if (this.getUserContextData() != null) (paramsReq as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    const data = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(paramsReq))) as Record<string, unknown>;
    const authenticationHelper = await AuthenticationHelper.create(this.pool.getUserPoolId().split("_")[1]);
    return this._authenticateUserInternal(data, authenticationHelper);
  }

  async sendMFACode(confirmationCode: string, mfaType: string = "SMS_MFA"): Promise<CognitoUserSession | null> {
    const challengeResponses: Record<string, string> = { USERNAME: this.username!, SMS_MFA_CODE: confirmationCode };
    if (mfaType === "SOFTWARE_TOKEN_MFA") challengeResponses["SOFTWARE_TOKEN_MFA_CODE"] = confirmationCode;
    if (mfaType === "EMAIL_OTP") challengeResponses["EMAIL_OTP_CODE"] = confirmationCode;
    if (this._clientSecretHash != null) challengeResponses["SECRET_HASH"] = this._clientSecretHash;
    await this.getCachedDeviceKeyAndPassword();
    if (this._deviceKey != null) challengeResponses["DEVICE_KEY"] = this._deviceKey;

    const paramsReq = {
      ChallengeName: mfaType,
      ChallengeResponses: challengeResponses,
      ClientId: this.pool.getClientId(),
      Session: this._session,
    };
    if (this.getUserContextData() != null) (paramsReq as Record<string, unknown>)["UserContextData"] = this.getUserContextData();

    let dataAuthenticate: Record<string, unknown>;
    try {
      dataAuthenticate = (await this.client!.request("RespondToAuthChallenge", await this._analyticsMetadataParamsDecorator(paramsReq))) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof CognitoClientException && e.code === "UserNotFoundException") {
        throw new CognitoUserPhoneNumberVerificationNecessaryException();
      }
      throw e;
    }

    if (dataAuthenticate["ChallengeName"] === "DEVICE_SRP_AUTH") return this.getDeviceResponse();

    this._signInUserSession = this.getCognitoUserSession(dataAuthenticate["AuthenticationResult"] as Record<string, unknown>);
    await this.cacheTokens();

    const newDeviceMetadata = (dataAuthenticate["AuthenticationResult"] as Record<string, unknown>)?.["NewDeviceMetadata"];
    if (newDeviceMetadata == null) return this._signInUserSession;

    const authHelper = await AuthenticationHelper.create(this.pool.getUserPoolId().split("_")[1]);
    await authHelper.generateHashDevice(
      (newDeviceMetadata as Record<string, string>)["DeviceGroupKey"],
      (newDeviceMetadata as Record<string, string>)["DeviceKey"],
    );
    const deviceSecretVerifierConfig = {
      Salt: base64Encode(hexToBytes(authHelper.getSaltDevices()!)),
      PasswordVerifier: base64Encode(hexToBytes(authHelper.getVerifierDevices()!)),
    };
    this.verifierDevices = deviceSecretVerifierConfig.PasswordVerifier;
    this._deviceGroupKey = (newDeviceMetadata as Record<string, string>)["DeviceGroupKey"];
    this._randomPassword = authHelper.getRandomPassword();

    const confirmDeviceParamsReq = {
      DeviceKey: (newDeviceMetadata as Record<string, string>)["DeviceKey"],
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
      DeviceSecretVerifierConfig: deviceSecretVerifierConfig,
      DeviceName: this.deviceName,
    };
    const dataConfirm = (await this.client!.request("ConfirmDevice", confirmDeviceParamsReq)) as Record<string, unknown>;
    this._deviceKey = (newDeviceMetadata as Record<string, string>)["DeviceKey"];
    await this.cacheDeviceKeyAndPassword();
    if (dataConfirm["UserConfirmationNecessary"] === true) {
      throw new CognitoUserDeviceConfirmationNecessaryException(this._signInUserSession);
    }
    return this._signInUserSession;
  }

  async getAttributeVerificationCode(attributeName: string): Promise<Record<string, unknown>> {
    this._signInUserSessionCheck();
    return (await this.client!.request("GetUserAttributeVerificationCode", {
      AttributeName: attributeName,
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
  }

  async verifyAttribute(attributeName: string, confirmationCode: string): Promise<boolean> {
    this._signInUserSessionCheck();
    await this.client!.request("VerifyUserAttribute", {
      AttributeName: attributeName,
      Code: confirmationCode,
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    });
    return true;
  }

  async changePassword(oldUserPassword: string, newUserPassword: string): Promise<boolean> {
    if (this._signInUserSession == null || !this._signInUserSession.isValid()) throw new Error("User is not authenticated");
    const paramsReq: Record<string, unknown> = {
      PreviousPassword: oldUserPassword,
      ProposedPassword: newUserPassword,
      AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
    };
    if (this._clientSecretHash != null) paramsReq["SecretHash"] = this._clientSecretHash;
    await this.client!.request("ChangePassword", paramsReq);
    return true;
  }

  async enableMfa(): Promise<boolean> {
    this._signInUserSessionCheck();
    const userData = (await this.client!.request("GetUser", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
    const attrs = userData["UserAttributes"] as Array<{ Name: string; Value: string }> | undefined;
    const phoneVerified = attrs?.some((a) => a.Name === "phone_number_verified" && a.Value === "true");
    if (!phoneVerified) throw new CognitoUserPhoneNumberVerificationNecessaryException(this._signInUserSession);

    await this.client!.request("SetUserSettings", {
      MFAOptions: [{ DeliveryMedium: "SMS", AttributeName: "phone_number" }],
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    });
    return true;
  }

  async disableMfa(): Promise<boolean> {
    this._signInUserSessionCheck();
    await this.client!.request("SetUserSettings", {
      MFAOptions: [],
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    });
    return true;
  }

  async getMFAOptions(): Promise<unknown[] | null> {
    if (this._signInUserSession == null || !this._signInUserSession.isValid()) throw new Error("User is not authenticated");
    const userData = (await this.client!.request("GetUser", {
      AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
    return (userData["MFAOptions"] as unknown[]) ?? null;
  }

  async forgotPassword(): Promise<Record<string, unknown>> {
    const paramsReq: Record<string, unknown> = { ClientId: this.pool.getClientId(), Username: this.username };
    if (this._clientSecretHash != null) paramsReq["SecretHash"] = this._clientSecretHash;
    if (this.getUserContextData() != null) paramsReq["UserContextData"] = this.getUserContextData();
    return (await this.client!.request("ForgotPassword", await this._analyticsMetadataParamsDecorator(paramsReq))) as Record<string, unknown>;
  }

  async confirmPassword(confirmationCode: string, newPassword: string): Promise<boolean> {
    const paramsReq: Record<string, unknown> = {
      ClientId: this.pool.getClientId(),
      Username: this.username,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    };
    if (this._clientSecretHash != null) paramsReq["SecretHash"] = this._clientSecretHash;
    if (this.getUserContextData() != null) paramsReq["UserContextData"] = this.getUserContextData();
    await this.client!.request("ConfirmForgotPassword", await this._analyticsMetadataParamsDecorator(paramsReq));
    return true;
  }

  async getUserAttributes(): Promise<CognitoUserAttribute[] | null> {
    if (this._signInUserSession == null || !this._signInUserSession.isValid()) throw new Error("User is not authenticated");
    const userData = (await this.client!.request("GetUser", {
      AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
    const list = userData["UserAttributes"] as Array<{ Name: string; Value: string }> | undefined;
    if (list == null) return null;
    return list.map((attr) => new CognitoUserAttribute(attr.Name, attr.Value));
  }

  async updateAttributes(attributes: CognitoUserAttribute[]): Promise<boolean> {
    this._signInUserSessionCheck();
    await this.client!.request("UpdateUserAttributes", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
      UserAttributes: attributes,
    });
    return true;
  }

  async deleteAttributes(attributeList: string[]): Promise<boolean> {
    if (this._signInUserSession == null || !this._signInUserSession.isValid()) throw new Error("User is not authenticated");
    await this.client!.request("DeleteUserAttributes", {
      AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
      UserAttributeNames: attributeList,
    });
    return true;
  }

  async deleteUser(): Promise<boolean> {
    this._signInUserSessionCheck();
    await this.client!.request("DeleteUser", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    });
    await this.clearCachedTokens();
    return true;
  }

  async associateSoftwareToken(): Promise<string | null> {
    if (this._signInUserSession?.isValid()) {
      const data = (await this.client!.request("AssociateSoftwareToken", {
        AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
      })) as Record<string, unknown>;
      return data["SecretCode"] as string;
    }
    if (this._session != null) {
      const data = (await this.client!.request("AssociateSoftwareToken", { Session: this._session })) as Record<string, unknown>;
      this._session = data["Session"] as string;
      return data["SecretCode"] as string;
    }
    throw new Error("User is not authenticated");
  }

  async verifySoftwareToken(opts: { totpCode: string; friendlyDeviceName?: string }): Promise<boolean> {
    if (this._signInUserSession?.isValid()) {
      const data = (await this.client!.request("VerifySoftwareToken", {
        AccessToken: this._signInUserSession.getAccessToken().getJwtToken(),
        UserCode: opts.totpCode,
        FriendlyDeviceName: opts.friendlyDeviceName ?? "My TOTP device",
      })) as Record<string, unknown>;
      return data["Status"] === "SUCCESS";
    }
    if (this._session != null) {
      const data = (await this.client!.request("VerifySoftwareToken", {
        Session: this._session,
        UserCode: opts.totpCode,
        FriendlyDeviceName: opts.friendlyDeviceName ?? "My TOTP device",
      })) as Record<string, unknown>;
      return data["Status"] === "SUCCESS";
    }
    throw new Error("User is not authenticated");
  }

  async setUserMfaPreference(
    smsMfaSettings?: IMfaSettings | null,
    softwareTokenMfaSettings?: IMfaSettings | null,
  ): Promise<boolean> {
    this._signInUserSessionCheck();
    try {
      await this.client!.request("SetUserMFAPreference", {
        SMSMfaSettings: smsMfaSettings ? imfaSettingsToMap(smsMfaSettings) : undefined,
        SoftwareTokenMfaSettings: softwareTokenMfaSettings ? imfaSettingsToMap(softwareTokenMfaSettings) : undefined,
        AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async setPreferredMFA(mfaMethod: string): Promise<boolean> {
    let smsMfaSettings: IMfaSettings | undefined;
    let softwareTokenMfaSettings: IMfaSettings | undefined;
    switch (mfaMethod) {
      case "SOFTWARE_TOKEN_MFA":
        softwareTokenMfaSettings = { preferredMfa: true, enabled: true };
        break;
      case "SMS_MFA":
        smsMfaSettings = { preferredMfa: true, enabled: true };
        break;
      case "NOMFA":
        smsMfaSettings = { preferredMfa: false, enabled: false };
        softwareTokenMfaSettings = { preferredMfa: false, enabled: false };
        break;
      default:
        throw new Error("No valid MFA method provided");
    }
    return this.setUserMfaPreference(smsMfaSettings, softwareTokenMfaSettings);
  }

  async getPreferredMFA(): Promise<string | null> {
    this._signInUserSessionCheck();
    const userData = (await this.client!.request("GetUser", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
    return userData["PreferredMfaSetting"] as string | null;
  }

  async getUserMFASettingList(): Promise<string | null> {
    this._signInUserSessionCheck();
    const userData = (await this.client!.request("GetUser", {
      AccessToken: this._signInUserSession!.getAccessToken().getJwtToken(),
    })) as Record<string, unknown>;
    return userData["UserMFASettingList"] as string | null;
  }
}
