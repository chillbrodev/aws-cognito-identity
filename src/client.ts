import { CognitoClientException } from "./cognito_client_exceptions.ts";

/** Keys that must never appear in request body except inside AuthParameters (e.g. USER_PASSWORD_AUTH). */
const SENSITIVE_KEYS = new Set(["password", "PASSWORD", "Password", "secret", "SECRET"]);

function sanitizeParamsForRequest(params: Record<string, unknown>, allowAuthParameters = true): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (allowAuthParameters && k === "AuthParameters" && v != null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = v;
      continue;
    }
    if (v != null && typeof v === "object" && !Array.isArray(v) && (v as object).constructor === Object) {
      const sub: Record<string, unknown> = {};
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(k2)) continue;
        sub[k2] = v2;
      }
      out[k] = sub;
    } else if (!SENSITIVE_KEYS.has(k)) {
      out[k] = v;
    }
  }
  return out;
}

export interface ClientOptions {
  endpoint?: string | null;
  region?: string | null;
  service?: string;
  userAgent?: string | null;
}

export class Client {
  private _service: string;
  private _userAgent: string;
  private _region: string | null;
  endpoint: string;

  constructor(options: ClientOptions = {}) {
    this._region = options.region ?? null;
    this._service = options.service ?? "AWSCognitoIdentityProviderService";
    this._userAgent = options.userAgent ?? "aws-amplify/0.0.x deno";
    this.endpoint =
      options.endpoint ??
      `https://cognito-idp.${this._region}.amazonaws.com/`;
  }

  async request(
    operation: string,
    params: Record<string, unknown>,
    opts?: { endpoint?: string; service?: string },
  ): Promise<Record<string, unknown>> {
    const endpointReq = opts?.endpoint ?? this.endpoint;
    const targetService = opts?.service ?? this._service;
    const safeParams = sanitizeParamsForRequest(params);
    const body = JSON.stringify(safeParams);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `${targetService}.${operation}`,
      "X-Amz-User-Agent": this._userAgent,
    };

    let response: Response;
    try {
      response = await fetch(endpointReq, {
        method: "POST",
        headers,
        body,
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
        throw new CognitoClientException("NetworkError", "NetworkError");
      }
      throw new CognitoClientException("Unknown Error", "Unknown error");
    }

    let data: Record<string, unknown> | null = null;
    try {
      const text = await response.text();
      if (text) data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // not json
    }

    if (response.status < 200 || response.status > 299) {
      let errorType = "UnknownError";
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "x-amzn-errortype") {
          errorType = value.split(":")[0];
        }
      });
      if (data == null) {
        throw new CognitoClientException(
          "Cognito client request error with unknown message",
          errorType,
          errorType,
          response.status,
        );
      }
      const dataType = data["__type"] as string | undefined;
      const dataCode = data["code"] as string | undefined;
      const code = (dataType ?? dataCode ?? errorType).split("#").pop() ?? errorType;
      throw new CognitoClientException(
        (data["message"] as string) ?? "Cognito client request error with unknown message",
        code,
        code,
        response.status,
      );
    }

    return data ?? {};
  }
}
