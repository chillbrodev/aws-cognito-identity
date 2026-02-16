# Error Handling Types

## Custom Error Classes

```ts
export class BaseError extends Error {
    public readonly cause?: unknown;
    public readonly context?: Record<string, unknown>;

    constructor(
        name: string,
        message: string,
        options: ErrorOptions = {},
    ) {
        super(message, options);
        this.name = name;
        this.cause = options.cause;
        this.context = options.context;
    }
}
```

## Error Type Utilities

```ts
type ErrorClassConstructor<ErrorTypeName extends string> = new (
    name: ErrorTypeName,
    message: string,
    options?: ErrorOptions,
) => BaseError;

function handleError<T, ErrorTypeName extends string>(
    { data, error }: { data: T | null; error: unknown },
    ErrorClass: ErrorClassConstructor<ErrorTypeName>,
    errorName: ErrorTypeName,
): NonNullable<T> {
    if (error || !data) {
        throw new ErrorClass(errorName, `An error occurred: ${errorName}`);
    }
    return data;
}
```
