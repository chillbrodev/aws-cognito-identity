import {
  bytesToHex,
  hexToBytes,
  hmacSha256,
  sha256Hex,
  utf8Encode,
} from "./crypto.ts";
import { generateRandomHex } from "./random_string.ts";

const INIT_N =
  "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1" +
  "29024E088A67CC74020BBEA63B139B22514A08798E3404DD" +
  "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245" +
  "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED" +
  "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D" +
  "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F" +
  "83655D23DCA3AD961C62F356208552BB9ED529077096966D" +
  "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B" +
  "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9" +
  "DE2BCBF6955817183995497CEA956AE515D2261898FA0510" +
  "15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64" +
  "ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7" +
  "ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B" +
  "F12FFA06D98A0864D87602733EC86A64521F2B18177B200C" +
  "BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31" +
  "43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";

const NEW_PASSWORD_REQUIRED_CHALLENGE_USER_ATTRIBUTE_PREFIX = "userAttributes.";

function modPow(b: bigint, e: bigint, m: bigint): bigint {
  if (e <= 0n) return 1n;
  let r = 1n;
  b = b % m;
  while (e > 0n) {
    if (e % 2n === 1n) r = (r * b) % m;
    e = e >> 1n;
    b = (b * b) % m;
  }
  return r;
}

export class AuthenticationHelper {
  poolName: string | null = null;
  N!: bigint;
  g!: bigint;
  k!: bigint;
  private _infoBits!: Uint8Array;
  private _smallAValue!: bigint;
  private _largeAValue: bigint | null = null;
  private _uHexHash: string = "";
  private _uValue: bigint | null = null;
  private _randomPassword: string | null = null;
  private _saltToHashDevices: string | null = null;
  private _verifierDevices: string | null = null;

  static async create(poolName: string | null): Promise<AuthenticationHelper> {
    const h = Object.create(AuthenticationHelper.prototype) as AuthenticationHelper;
    h.poolName = poolName;
    h.N = BigInt("0x" + INIT_N);
    h.g = 2n;
    h._infoBits = utf8Encode("Caldera Derived Key");
    const kHex = await sha256Hex(hexToBytes("00" + h.N.toString(16) + "0" + h.g.toString(16)));
    h.k = BigInt("0x" + kHex.padStart(64, "0"));
    h._smallAValue = await h.generateRandomSmallA();
    h._largeAValue = null;
    h._uValue = null;
    h._randomPassword = null;
    h._saltToHashDevices = null;
    h._verifierDevices = null;
    return h;
  }

  private async hash(buf: Uint8Array): Promise<string> {
    const hashHex = await sha256Hex(buf);
    return hashHex.padStart(64, "0");
  }

  private async hexHash(hexStr: string): Promise<string> {
    return this.hash(hexToBytes(hexStr));
  }

  getSmallAValue(): bigint {
    return this._smallAValue;
  }

  getLargeAValue(): bigint {
    if (this._largeAValue != null) return this._largeAValue;
    this._largeAValue = this.calculateA(this._smallAValue);
    return this._largeAValue;
  }

  getRandomPassword(): string | null {
    return this._randomPassword;
  }

  getSaltDevices(): string | null {
    return this._saltToHashDevices;
  }

  getVerifierDevices(): string | null {
    return this._verifierDevices;
  }

  getNewPasswordRequiredChallengeUserAttributePrefix(): string {
    return NEW_PASSWORD_REQUIRED_CHALLENGE_USER_ATTRIBUTE_PREFIX;
  }

  async getPasswordAuthenticationKey(
    username: string | null,
    password: string | null,
    serverBValue: bigint,
    salt: bigint,
  ): Promise<Uint8Array> {
    if (serverBValue % this.N === 0n) throw new Error("B cannot be zero.");
    this._uValue = await this.calculateU(this.getLargeAValue(), serverBValue);
    if (this._uValue === 0n) throw new Error("U cannot be zero.");

    const usernamePassword = `${this.poolName}${username}:${password}`;
    const usernamePasswordHash = await this.hash(utf8Encode(usernamePassword));
    const xValue = BigInt(
      "0x" + (await this.hexHash(this.padHex(salt) + usernamePasswordHash)),
    );

    const sValue = this.calculateS(xValue, serverBValue);
    const hkdf = await this.computehkdf(
      hexToBytes(this.padHex(sValue)),
      hexToBytes(this.padHex(this._uValue!)),
    );
    return hkdf;
  }

  private async generateRandomSmallA(): Promise<bigint> {
    const hexRandom = generateRandomHex(128);
    const randomBigInt = BigInt("0x" + hexRandom);
    return randomBigInt % this.N;
  }

  generateRandomString(): string {
    return generateRandomHex(40);
  }

  async generateHashDevice(
    deviceGroupKey: string | null,
    deviceKey: string | null,
  ): Promise<void> {
    this._randomPassword = this.generateRandomString();
    const combinedString = `${deviceGroupKey}${deviceKey}:${this._randomPassword}`;
    const hashedString = await this.hash(utf8Encode(combinedString));

    const hexRandom = generateRandomHex(16);
    this._saltToHashDevices = this.padHex(BigInt("0x" + hexRandom));

    const verifierDevicesNotPadded = modPow(
      this.g,
      BigInt("0x" + (await this.hexHash(this._saltToHashDevices! + hashedString))),
      this.N,
    );
    this._verifierDevices = this.padHex(verifierDevicesNotPadded);
  }

  private calculateA(a: bigint): bigint {
    const A = modPow(this.g, a, this.N);
    if (A % this.N === 0n) throw new Error("Illegal parameter. A mod N cannot be 0.");
    return A;
  }

  private async calculateU(a: bigint, b: bigint): Promise<bigint> {
    this._uHexHash = await this.hexHash(this.padHex(a) + this.padHex(b));
    return BigInt("0x" + this._uHexHash);
  }

  private calculateS(xValue: bigint, serverBValue: bigint): bigint {
    const gModPowXN = modPow(this.g, xValue, this.N);
    const intValue2 = serverBValue - this.k * gModPowXN;
    const result = modPow(
      intValue2,
      this._smallAValue + this._uValue! * xValue,
      this.N,
    );
    return result % this.N;
  }

  private async computehkdf(ikm: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
    const prk = await hmacSha256(salt, ikm);
    const infoBitsUpdate = new Uint8Array(this._infoBits.length + 1);
    infoBitsUpdate.set(this._infoBits);
    infoBitsUpdate[this._infoBits.length] = 1;
    const dig = await hmacSha256(prk, infoBitsUpdate);
    return dig.slice(0, 16);
  }

  padHex(bigInt: bigint): string {
    let hashStr = bigInt.toString(16);
    if (hashStr.length % 2 === 1) hashStr = "0" + hashStr;
    else if (/[89ABCDEFabcdef]/.test(hashStr[0] ?? "")) hashStr = "00" + hashStr;
    return hashStr;
  }

  toUnsignedHex(input: string): string {
    let output: string;
    let negative = false;
    if (input[0] === "-") {
      negative = true;
      output = input.slice(1);
    } else {
      output = input;
    }
    while (output.length < 32) output = "0" + output;
    if (negative) {
      const toReplace = output[0];
      output = output.slice(1);
      const updatedLeadingDigit = (parseInt(toReplace, 16) | 0x8).toString(16);
      output = updatedLeadingDigit + output;
    }
    return output;
  }
}
