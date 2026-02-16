export class CognitoUserAttribute {
  constructor(
    public name?: string | null,
    public value?: string | null,
  ) {}

  getValue(): string | null | undefined {
    return this.value;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  getName(): string | null | undefined {
    return this.name;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  toJson(): Record<string, string | null | undefined> {
    return { Name: this.name, Value: this.value };
  }
}
