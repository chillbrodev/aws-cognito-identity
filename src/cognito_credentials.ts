import type { Client } from "./client.ts";
import { CognitoClientException } from "./cognito_client_exceptions.ts";
import { CognitoIdentityId } from "./cognito_identity_id.ts";
import type { CognitoUserPool } from "./cognito_user_pool.ts";

export class CognitoCredentials {
  accessKeyId: string | null = null;
  secretAccessKey: string | null = null;
  sessionToken: string | null = null;
  expireTime: number | null = null;
  userIdentityId: string | null = null;

  private _retryCount = 0;

  constructor(
    private _identityPoolId: string,
    private _pool: CognitoUserPool,
    opts?: { region?: string },
  ) {
    // region from pool if not provided
  }

  private _region(): string {
    return this._pool.getRegion();
  }

  async getAwsCredentials(
    token: string | null,
    authenticator?: string | null,
  ): Promise<void> {
    const now = Date.now();
    if (
      this.expireTime != null &&
      now <= this.expireTime - 60_000
    ) {
      return;
    }

    const identityId = new CognitoIdentityId(this._identityPoolId, this._pool, {
      token: token ?? undefined,
      authenticator: authenticator ?? undefined,
    });
    await this._getAwsCredentials(identityId);
  }

  async getGuestAwsCredentialsId(): Promise<void> {
    const now = Date.now();
    if (
      this.expireTime != null &&
      now <= this.expireTime - 60_000
    ) {
      return;
    }

    const identityId = new CognitoIdentityId(this._identityPoolId, this._pool);
    await this._getAwsCredentials(identityId);
  }

  private async _getAwsCredentials(identityId: CognitoIdentityId): Promise<void> {
    this.userIdentityId = await identityId.getIdentityId();

    const paramsReq: Record<string, unknown> = {
      IdentityId: this.userIdentityId,
    };
    if (identityId.loginParam != null) paramsReq["Logins"] = identityId.loginParam;

    const client = this._pool.client;
    if (!client) throw new Error("No client");

    try {
      const data = (await client.request("GetCredentialsForIdentity", paramsReq, {
        service: "AWSCognitoIdentityService",
        endpoint: `https://cognito-identity.${this._region()}.amazonaws.com/`,
      })) as Record<string, unknown>;

      const creds = data["Credentials"] as Record<string, unknown>;
      this.accessKeyId = creds["AccessKeyId"] as string;
      this.secretAccessKey = creds["SecretKey"] as string;
      this.sessionToken = creds["SessionToken"] as string;
      const exp = creds["Expiration"];
      this.expireTime = typeof exp === "number" ? exp * 1000 : (exp as number) * 1000;
      this._retryCount = 0;
    } catch (e) {
      if (e instanceof CognitoClientException) {
        await identityId.removeIdentityId();
        if (e.code === "NotAuthorizedException" && this._retryCount < 1) {
          this._retryCount++;
          return this._getAwsCredentials(identityId);
        }
      }
      this._retryCount = 0;
      throw e;
    }
  }

  async resetAwsCredentials(): Promise<void> {
    const identityId = new CognitoIdentityId(this._identityPoolId, this._pool);
    await identityId.removeIdentityId();
    this.expireTime = null;
    this.accessKeyId = null;
    this.secretAccessKey = null;
    this.sessionToken = null;
  }
}
