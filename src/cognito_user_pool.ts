import type { AttributeArg } from "./attribute_arg.ts";
import { sanitizeForRequest } from "./cognito_user.ts";
import { Client } from "./client.ts";
import type { CognitoStorage } from "./storage.ts";
import { CognitoMemoryStorage } from "./storage.ts";
import { CognitoStorageHelper } from "./storage.ts";
import type { CognitoUser } from "./cognito_user.ts";
import type { ParamsDecorator } from "./params_decorators.ts";
import { noOpsParamsDecorator } from "./params_decorators.ts";

export class CognitoUserPoolData {
  constructor(
    public user: CognitoUser,
    public userConfirmed?: boolean,
    public userSub?: string | null,
  ) {}

  static fromData(
    user: CognitoUser,
    parsedJson: Record<string, unknown>,
  ): CognitoUserPoolData {
    return new CognitoUserPoolData(
      user,
      (parsedJson["UserConfirmed"] as boolean) ?? false,
      parsedJson["UserSub"] as string | undefined,
    );
  }
}

export class CognitoUserPool {
  client: Client | null;
  storage: CognitoStorage;

  private _userPoolId: string;
  private _clientId: string | null;
  private _clientSecret: string | null;
  private _region: string | null;
  private _userAgent: string | null;
  private _analyticsMetadataParamsDecorator: ParamsDecorator;

  constructor(
    userPoolId: string,
    clientId: string,
    opts?: {
      clientSecret?: string | null;
      endpoint?: string | null;
      customClient?: Client | null;
      customUserAgent?: string | null;
      storage?: CognitoStorage | null;
      advancedSecurityDataCollectionFlag?: boolean;
      analyticsMetadataParamsDecorator?: ParamsDecorator | null;
    },
  ) {
    const regExp = /^[\w-]+_.+$/;
    if (!regExp.test(userPoolId)) {
      throw new Error("Invalid userPoolId format.");
    }
    this._userPoolId = userPoolId;
    this._clientId = clientId;
    this._clientSecret = opts?.clientSecret ?? null;
    this._region = userPoolId.split("_")[0];
    this._userAgent = opts?.customUserAgent ?? null;
    this._analyticsMetadataParamsDecorator =
      opts?.analyticsMetadataParamsDecorator ?? noOpsParamsDecorator;

    this.client = new Client({
      region: this._region,
      endpoint: opts?.endpoint ?? undefined,
      userAgent: this._userAgent ?? undefined,
    });
    if (opts?.customClient != null) this.client = opts.customClient;

    this.storage =
      opts?.storage != null
        ? opts.storage
        : new CognitoStorageHelper(new CognitoMemoryStorage()).getStorage();
  }

  get lastUserKey(): string {
    return `CognitoIdentityServiceProvider.${this._clientId}.LastAuthUser`;
  }

  getUserPoolId(): string {
    return this._userPoolId;
  }

  getClientId(): string | null {
    return this._clientId;
  }

  getRegion(): string {
    return this._region!;
  }

  getClientSecret(): string | null {
    return this._clientSecret;
  }

  async getCurrentUser(): Promise<CognitoUser | null> {
    const lastAuthUser = await this.storage.getItem(this.lastUserKey);
    if (lastAuthUser != null) {
      const { CognitoUser: CognitoUserCtor } = await import("./cognito_user.ts");
      let clientSecretHash: string | undefined;
      if (this._clientSecret != null && this._clientId != null) {
        clientSecretHash = await CognitoUserCtor.calculateClientSecretHash(
          lastAuthUser as string,
          this._clientId,
          this._clientSecret,
        );
      }
      return new CognitoUserCtor(lastAuthUser as string, this, {
        storage: this.storage,
        clientSecretHash: clientSecretHash ?? undefined,
        deviceName: this._userAgent ?? undefined,
        analyticsMetadataParamsDecorator: this._analyticsMetadataParamsDecorator,
      });
    }
    return null;
  }

  getUserContextData(_username?: string | null): string | null {
    return null;
  }

  async signUp(
    username: string,
    password: string,
    opts?: {
      userAttributes?: AttributeArg[] | null;
      validationData?: AttributeArg[] | null;
      clientMetadata?: Record<string, string> | null;
    },
  ): Promise<CognitoUserPoolData> {
    const { CognitoUser: CognitoUserCtor } = await import("./cognito_user.ts");
    const params: Record<string, unknown> = {
      ClientId: this._clientId,
      Username: username,
      Password: password,
      UserAttributes: opts?.userAttributes ?? undefined,
      ValidationData: opts?.validationData ?? undefined,
      ClientMetadata: sanitizeForRequest(opts?.clientMetadata as Record<string, unknown> | undefined),
    };
    if (this._clientSecret != null && this._clientId != null) {
      params["SecretHash"] = await CognitoUserCtor.calculateClientSecretHash(
        username,
        this._clientId,
        this._clientSecret,
      );
    }

    const data = (await this.client!.request(
      "SignUp",
      await this._analyticsMetadataParamsDecorator(params),
    )) as Record<string, unknown>;

    let clientSecretHash: string | undefined;
    if (this._clientSecret != null && this._clientId != null) {
      clientSecretHash = await CognitoUserCtor.calculateClientSecretHash(
        username,
        this._clientId,
        this._clientSecret,
      );
    }
    const user = new CognitoUserCtor(username, this, {
      storage: this.storage,
      clientSecretHash: clientSecretHash ?? undefined,
      deviceName: this._userAgent ?? undefined,
      analyticsMetadataParamsDecorator: this._analyticsMetadataParamsDecorator,
    });
    return CognitoUserPoolData.fromData(user, data);
  }
}
