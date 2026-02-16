# Class Patterns

## Base Classes

Use base classes for shared functionality:

```ts
export class BaseError extends Error {
    public readonly cause?: unknown;
    public readonly context?: Record<string, unknown>;
    private readonly _statusCode?: number;

    constructor(
        name: string,
        message: string,
        options: ErrorOptions = {},
    ) {
        super(message, options);
        this.name = name;
        this.cause = options.cause;
        this.context = options.context;
        this._statusCode = options.statusCode;
    }

    get statusCode(): number {
        return this._statusCode ?? 500;
    }
}
```

**Guidelines**:

- Use `override` keyword when overriding base class members
- Mark readonly properties as `readonly`
- Use private fields with `_` prefix for internal state (convention)
- Provide getters for computed properties

## Method Signatures

```ts
class Service {
    // Public method
    public async fetchData(id: string): Promise<Data> {
        // Implementation
    }

    // Private method
    private validateInput(input: unknown): input is ValidInput {
        // Validation logic
    }

    // Protected method (accessible to subclasses)
    protected processData(data: Data): ProcessedData {
        // Implementation
    }

    // Getter
    public get computedValue(): string {
        return this.compute();
    }

    // Setter
    public set value(newValue: string) {
        this._value = newValue;
    }
}
```
