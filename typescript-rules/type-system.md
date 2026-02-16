# Type System Patterns

## Interfaces

Use interfaces for object shapes and data structures:

```ts
export interface User {
    id: string;
    email: string;
    firstName: string | undefined;
    lastName: string | undefined;
    createdAt: Date;
}

export interface Config {
    apiKey: string;
    baseUrl: string;
    timeout: number;
}
```

**Guidelines**:

- Export interfaces that are used across modules
- Use descriptive, fully-written names (avoid abbreviations)
- Prefer `| undefined` over optional properties (`?`) when the distinction
  matters
- Group related interfaces in dedicated files (e.g., `.interfaces.ts`)

## Type Aliases

Use type aliases for unions, intersections, and complex types:

```ts
export type Status = "pending" | "completed" | "failed";

export type ErrorClassConstructor<ErrorTypeName extends string> = new (
    name: ErrorTypeName,
    message: string,
    options?: ErrorOptions,
) => BaseError<ErrorTypeName>;

export type DataOrErrorInput<T> = {
    data: T;
    error: unknown;
};
```

## Generic Types

Use generics for reusable, type-safe utilities:

```ts
export function processData<T>(
    data: T,
    transform: (item: T) => T,
): T {
    return transform(data);
}

export function getFirstItem<T>(items: T[]): T | undefined {
    return items[0];
}

export function createErrorHandler<T extends string>(
    ErrorClass: new (name: T, message: string) => Error,
) {
    return (name: T, message: string) => {
        throw new ErrorClass(name, message);
    };
}
```

## Type Guards

Use type guards for runtime type checking:

```ts
export function isString(value: unknown): value is string {
    return typeof value === "string";
}

export function isError(err: unknown): err is Error {
    return err instanceof Error;
}

// Usage
if (isString(value)) {
    // TypeScript knows value is string here
    console.log(value.toUpperCase());
}
```

## Utility Types

Commonly used TypeScript utility types:

- `NonNullable<T>`: Exclude null and undefined
- `Partial<T>`: Make all properties optional
- `Required<T>`: Make all properties required
- `Pick<T, K>`: Select specific properties
- `Omit<T, K>`: Exclude specific properties
- `Record<K, V>`: Object with specific key/value types
- `Readonly<T>`: Make all properties readonly
- `ReturnType<T>`: Extract return type from function
- `Parameters<T>`: Extract parameters from function
