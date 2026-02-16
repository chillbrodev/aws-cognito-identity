import type { CognitoUserSession } from "./cognito_user_session.ts";

export class CognitoUserException extends Error {
  constructor(
    message?: string,
    public challengeName?: string | null,
  ) {
    super(message ?? "CognitoUserException");
    this.name = "CognitoUserException";
    Object.setPrototypeOf(this, CognitoUserException.prototype);
  }

  override toString(): string {
    let s = "CognitoUserException";
    if (this.challengeName) s += ` "${this.challengeName}"`;
    if (this.message) s += ` ${this.message}`;
    return s;
  }
}

export class CognitoUserNewPasswordRequiredException extends CognitoUserException {
  constructor(
    public userAttributes?: Record<string, unknown> | null,
    public requiredAttributes?: string[] | null,
    message = "New Password required",
  ) {
    super(message);
    this.name = "CognitoUserNewPasswordRequiredException";
  }
}

export class CognitoUserMfaRequiredException extends CognitoUserException {
  constructor(
    challengeName = "SMS_MFA",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserMfaRequiredException";
  }
}

export class CognitoUserSelectMfaTypeException extends CognitoUserException {
  constructor(
    challengeName = "SELECT_MFA_TYPE",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserSelectMfaTypeException";
  }
}

export class CognitoUserMfaSetupException extends CognitoUserException {
  constructor(
    challengeName = "MFA_SETUP",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserMfaSetupException";
  }
}

export class CognitoUserTotpRequiredException extends CognitoUserException {
  constructor(
    challengeName = "SOFTWARE_TOKEN_MFA",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserTotpRequiredException";
  }
}

export class CognitoUserEmailOtpRequiredException extends CognitoUserException {
  constructor(
    challengeName = "EMAIL_OTP",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserEmailOtpRequiredException";
  }
}

export class CognitoUserCustomChallengeException extends CognitoUserException {
  constructor(
    challengeName = "CUSTOM_CHALLENGE",
    public challengeParameters?: Record<string, unknown> | null,
    message?: string,
  ) {
    super(message, challengeName);
    this.name = "CognitoUserCustomChallengeException";
  }
}

export class CognitoUserConfirmationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "User Confirmation Necessary",
  ) {
    super(message);
    this.name = "CognitoUserConfirmationNecessaryException";
  }
}

export class CognitoUserDeviceConfirmationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "User Device Confirmation Necessary",
  ) {
    super(message);
    this.name = "CognitoUserDeviceConfirmationNecessaryException";
  }
}

export class CognitoUserPhoneNumberVerificationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "Verification of Attribute 'phone_number' Necessary",
  ) {
    super(message);
    this.name = "CognitoUserPhoneNumberVerificationNecessaryException";
  }
}
