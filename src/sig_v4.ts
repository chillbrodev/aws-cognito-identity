import {
  bytesToHex,
  hexToBytes,
  hmacSha256,
  utf8Encode,
} from "./crypto.ts";

const AWS_SHA256 = "AWS4-HMAC-SHA256";
const AWS4_REQUEST = "aws4_request";
const AWS4 = "AWS4";
const X_AMZ_DATE = "x-amz-date";
const X_AMZ_SECURITY_TOKEN = "x-amz-security-token";
const HOST = "host";
const AUTHORIZATION = "Authorization";
const DEFAULT_CONTENT_TYPE = "application/json";
const DEFAULT_ACCEPT_TYPE = "application/json";

export class AwsSigV4Client {
  endpoint: string;
  pathComponent: string | null;
  constructor(
    public accessKey: string,
    public secretKey: string,
    endpoint: string,
    public serviceName: string = "execute-api",
    public region: string = "us-east-1",
    public sessionToken?: string | null,
    public defaultContentType: string = "application/json",
    public defaultAcceptType: string = "application/json",
  ) {
    const parsed = new URL(endpoint);
    this.endpoint = `${parsed.protocol}//${parsed.hostname}`;
    this.pathComponent = parsed.pathname || null;
  }
}

export interface SigV4RequestOptions {
  method: string;
  path?: string | null;
  datetime?: string | null;
  queryParams?: Record<string, string> | null;
  headers?: Record<string, string | null> | null;
  authorizationHeader?: string | null;
  body?: unknown;
}

export class SigV4Request {
  method!: string;
  path!: string;
  body!: string;
  url!: string;
  headers!: Record<string, string | null>;
  queryParams!: Record<string, string> | null;
  datetime!: string;
  canonicalRequest!: string;
  hashedCanonicalRequest!: string;
  credentialScope!: string;
  stringToSign!: string;
  signature!: string;

  constructor(
    public awsSigV4Client: AwsSigV4Client,
    options: SigV4RequestOptions,
  ) {
    this.method = (options.method || "GET").toUpperCase();
    this.path = `${this.awsSigV4Client.pathComponent || ""}${options.path || ""}`;
    this.queryParams = options.queryParams ?? null;
    this.datetime = options.datetime ?? SigV4.generateDatetime();
    this.headers = Object.fromEntries(
      Object.entries(options.headers ?? {}).map(([k, v]) => [
        k.toLowerCase(),
        v,
      ]),
    );
    if (this.headers["content-type"] == null && this.method !== "GET") {
      this.headers["content-type"] = this.awsSigV4Client.defaultContentType;
    }
    if (this.headers["accept"] == null) {
      this.headers["accept"] = this.awsSigV4Client.defaultAcceptType;
    }
    if (options.body == null || this.method === "GET") {
      this.body = "";
    } else {
      this.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }
    if (this.body === "") delete this.headers["content-type"];
    this.headers[X_AMZ_DATE] = this.datetime;
    const endpointUri = new URL(this.awsSigV4Client.endpoint);
    this.headers[HOST] = endpointUri.hostname;
    if (this.awsSigV4Client.sessionToken != null) {
      this.headers[X_AMZ_SECURITY_TOKEN] = this.awsSigV4Client.sessionToken;
    }
    delete this.headers[HOST];
    this.url = `${this.awsSigV4Client.endpoint}${this.path}`;
    const qs = SigV4.buildCanonicalQueryString(this.queryParams);
    if (qs) this.url += "?" + qs;
    // Authorization and signing key/signature set by async init
    this.canonicalRequest = "";
    this.hashedCanonicalRequest = "";
    this.credentialScope = "";
    this.stringToSign = "";
    this.signature = "";
  }

  /** Call after construction to compute authorization (async crypto). */
  async sign(authorizationHeader?: string | null): Promise<void> {
    const authHeader =
      authorizationHeader ?? (await generateAuthorization(this, this.datetime));
    this.headers[AUTHORIZATION] = authHeader;
  }
}

async function generateAuthorization(
  req: SigV4Request,
  datetime: string,
): Promise<string> {
  const payloadHashHex = await SigV4.hashCanonicalRequestAsync(req.body);
  req.canonicalRequest = SigV4.buildCanonicalRequest(
    req.method,
    req.path,
    req.queryParams,
    req.headers,
    payloadHashHex,
  );
  req.hashedCanonicalRequest = await SigV4.hashCanonicalRequestAsync(
    req.canonicalRequest,
  );
  req.credentialScope = SigV4.buildCredentialScope(
    datetime,
    req.awsSigV4Client.region,
    req.awsSigV4Client.serviceName,
  );
  req.stringToSign = SigV4.buildStringToSign(
    datetime,
    req.credentialScope,
    req.hashedCanonicalRequest,
  );
  const signingKey = await SigV4.calculateSigningKeyAsync(
    req.awsSigV4Client.secretKey,
    datetime,
    req.awsSigV4Client.region,
    req.awsSigV4Client.serviceName,
  );
  req.signature = await SigV4.calculateSignatureAsync(signingKey, req.stringToSign);
  return SigV4.buildAuthorizationHeader(
    req.awsSigV4Client.accessKey,
    req.credentialScope,
    req.headers,
    req.signature,
  );
}

export class SigV4 {
  static generateDatetime(): string {
    const now = new Date();
    return now
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z")
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  static hashCanonicalRequest(request: string): string {
    // Sync version for compatibility - not used in async path
    return "";
  }

  static async hashCanonicalRequestAsync(request: string): Promise<string> {
    const enc = new Uint8Array(utf8Encode(request));
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return bytesToHex(new Uint8Array(hash));
  }

  static hexEncode(value: Uint8Array): string {
    return bytesToHex(value);
  }

  static buildCanonicalUri(uri: string): string {
    return encodeURI(uri);
  }

  static buildCanonicalQueryString(
    queryParams: Record<string, string> | null,
  ): string {
    if (queryParams == null) return "";
    const sorted = Object.keys(queryParams).sort();
    return sorted
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(
            queryParams[key].replace(/\+/g, " "),
          )}`,
      )
      .join("&");
  }

  static buildCanonicalHeaders(
    headers: Record<string, string | null>,
  ): string {
    const sorted = Object.keys(headers).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    return sorted
      .map((p) => `${p.toLowerCase()}:${headers[p]}\n`)
      .join("");
  }

  static buildCanonicalSignedHeaders(
    headers: Record<string, string | null>,
  ): string {
    return Object.keys(headers)
      .map((p) => p.toLowerCase())
      .sort()
      .join(";");
  }

  static buildCanonicalRequest(
    method: string,
    path: string,
    queryParams: Record<string, string> | null,
    headers: Record<string, string | null>,
    hashedPayloadHex: string,
  ): string {
    const parts = [
      method,
      this.buildCanonicalUri(path),
      this.buildCanonicalQueryString(queryParams),
      this.buildCanonicalHeaders(headers),
      this.buildCanonicalSignedHeaders(headers),
      hashedPayloadHex,
    ];
    return parts.join("\n");
  }

  static buildStringToSign(
    datetime: string,
    credentialScope: string,
    hashedCanonicalRequest: string,
  ): string {
    return `${AWS_SHA256}\n${datetime}\n${credentialScope}\n${hashedCanonicalRequest}`;
  }

  static buildCredentialScope(
    datetime: string,
    region: string,
    service: string,
  ): string {
    return `${datetime.slice(0, 8)}/${region}/${service}/${AWS4_REQUEST}`;
  }

  static buildAuthorizationHeader(
    accessKey: string,
    credentialScope: string,
    headers: Record<string, string | null>,
    signature: string,
  ): string {
    return `${AWS_SHA256} Credential=${accessKey}/${credentialScope}, SignedHeaders=${this.buildCanonicalSignedHeaders(headers)}, Signature=${signature}`;
  }

  static async calculateSigningKeyAsync(
    secretKey: string,
    datetime: string,
    region: string,
    service: string,
  ): Promise<Uint8Array> {
    const kDate = await hmacSha256(utf8Encode(AWS4 + secretKey), utf8Encode(datetime.slice(0, 8)));
    const kRegion = await hmacSha256(kDate, utf8Encode(region));
    const kService = await hmacSha256(kRegion, utf8Encode(service));
    return hmacSha256(kService, utf8Encode(AWS4_REQUEST));
  }

  static async calculateSignatureAsync(
    signingKey: Uint8Array,
    stringToSign: string,
  ): Promise<string> {
    const sig = await hmacSha256(signingKey, utf8Encode(stringToSign));
    return bytesToHex(sig);
  }
}
