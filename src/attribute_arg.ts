export interface AttributeArgLike {
  name?: string | null;
  value?: string | null;
}

export class AttributeArg implements AttributeArgLike {
  constructor(
    public name?: string | null,
    public value?: string | null,
  ) {}

  toJson(): Record<string, string | null | undefined> {
    return { Name: this.name, Value: this.value };
  }
}
