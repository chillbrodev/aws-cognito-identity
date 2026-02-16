/** Name/value pair for Cognito user or validation attributes. */
export interface AttributeArgLike {
  name?: string | null;
  value?: string | null;
}

/** Attribute name/value for sign-up and verification (e.g. given_name, email_verified). */
export class AttributeArg implements AttributeArgLike {
  constructor(
    public name?: string | null,
    public value?: string | null,
  ) {}

  toJson(): Record<string, string | null | undefined> {
    return { Name: this.name, Value: this.value };
  }
}
