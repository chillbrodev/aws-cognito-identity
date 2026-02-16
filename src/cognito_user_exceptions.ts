import type { CognitoUserSession } from "./cognito_user_session.ts";

/** Base exception for Cognito user/challenge errors (MFA, new password, etc.). */
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

/** Thrown when user must set a new password (e.g. FORCE_CHANGE_PASSWORD). */
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

/** Thrown when MFA is required to complete sign-in (SMS, TOTP, etc.). */
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

/** Thrown when user must choose an MFA type. */
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

/** Thrown when MFA setup is required. */
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

/** Thrown when TOTP (authenticator app) verification is required. */
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

/** Thrown when email OTP verification is required. */
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

/** Thrown when a custom auth challenge (Lambda) is required. */
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

/** Thrown when user must confirm sign-up (e.g. email/SMS code). */
export class CognitoUserConfirmationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "User Confirmation Necessary",
  ) {
    super(message);
    this.name = "CognitoUserConfirmationNecessaryException";
  }
}

/** Thrown when device confirmation is required. */
export class CognitoUserDeviceConfirmationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "User Device Confirmation Necessary",
  ) {
    super(message);
    this.name = "CognitoUserDeviceConfirmationNecessaryException";
  }
}

/** Thrown when phone number verification is required. */
export class CognitoUserPhoneNumberVerificationNecessaryException extends CognitoUserException {
  constructor(
    public signInUserSession?: CognitoUserSession | null,
    message = "Verification of Attribute 'phone_number' Necessary",
  ) {
    super(message);
    this.name = "CognitoUserPhoneNumberVerificationNecessaryException";
  }
}
