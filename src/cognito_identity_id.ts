import type { Client } from "./client.ts";
import type { CognitoStorage } from "./storage.ts";
import type { CognitoUserPool } from "./cognito_user_pool.ts";

/** Identity ID from Cognito Identity Pool (used with {@link CognitoCredentials}). */
export class CognitoIdentityId {
  identityId: string | null = null;
  private _identityIdKey: string;
  private _loginParam: Record<string, string | null> | null;

  constructor(
    private _identityPoolId: string,
    private _pool: CognitoUserPool,
    opts?: { authenticator?: string; token?: string | null },
  ) {
    const region = _pool.getRegion();
    const authenticator =
      opts?.authenticator ??
      `cognito-idp.${region}.amazonaws.com/${_pool.getUserPoolId()}`;
    this._identityIdKey = `aws.cognito.identity-id.${_identityPoolId}`;
    if (opts?.token != null) {
      this._loginParam = { [authenticator]: opts.token };
    } else {
      this._loginParam = null;
    }
  }

  get loginParam(): Record<string, string | null> | null {
    return this._loginParam;
  }

  async getIdentityId(): Promise<string | null> {
    const storage = this._pool.storage;
    const cached = await storage.getItem(this._identityIdKey);
    if (cached != null) {
      this.identityId = cached as string;
      return this.identityId;
    }

    const client = this._pool.client;
    if (!client) throw new Error("No client");

    const paramsReq: Record<string, unknown> = {
      IdentityPoolId: this._identityPoolId,
    };
    if (this._loginParam != null) paramsReq["Logins"] = this._loginParam;

    const data = (await client.request("GetId", paramsReq, {
      service: "AWSCognitoIdentityService",
      endpoint: `https://cognito-identity.${this._pool.getRegion()}.amazonaws.com/`,
    })) as Record<string, unknown>;

    this.identityId = (data["IdentityId"] as string) ?? null;
    if (this.identityId) await storage.setItem(this._identityIdKey, this.identityId);
    return this.identityId;
  }

  async removeIdentityId(): Promise<unknown> {
    return this._pool.storage.removeItem(this._identityIdKey);
  }
}
