export class CognitoClientException extends Error {
  declare name: string;
  constructor(
    message: string,
    public code?: string,
    errorName?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "CognitoClientException";
    if (errorName != null) this.name = errorName;
    Object.setPrototypeOf(this, CognitoClientException.prototype);
  }

  override toString(): string {
    return `CognitoClientException{statusCode: ${this.statusCode}, code: ${this.code}, name: ${this.name}, message: ${this.message}}`;
  }
}
